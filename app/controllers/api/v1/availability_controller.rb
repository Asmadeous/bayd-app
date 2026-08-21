module Api
  module V1
    # Public availability checks used by the booking form so customers pick a real
    # open slot (from SimplyBook, which subtracts each provider's booked time from
    # their working schedule) instead of typing any date/time.
    #
    #   GET /availability          → one tech's open times for a service+date
    #   GET /availability/any      → every tech's open times for a service+date,
    #                                so the UI can auto-shift to whoever is free
    #                                ("Susi's booked at 2pm — Claire is free then").
    class AvailabilityController < ApplicationController
      skip_before_action :authenticate_user!

      # One specific tech's open times. { slots:, mapped:, date: }
      def show
        service = Service.active.find_by(id: params[:service_id])
        employee = EmployeeProfile.active.find_by(id: params[:employee_id])
        date = parse_date(params[:date])

        if service.nil? || employee.nil? || date.nil?
          return render json: { error: "service_id, employee_id and a valid date are required" },
                        status: :bad_request
        end

        return render json: { slots: [], mapped: false } unless mapped?(service, employee)

        slots = client&.available_slots(
          service_id:  service.simplybook_event_id,
          provider_id: employee.simplybook_unit_id,
          date:        date,
          count:       slot_count
        ) || []
        # Drop slots the tech can't reach given travel between adjacent jobs (only
        # when we know the customer's location — sent once the address is entered).
        slots = filter_by_travel(employee, service, date, slots)

        render json: { slots: slots, mapped: true, date: date.to_s }
      rescue StandardError => e
        Rails.logger.warn("[AvailabilityController#show] #{e.class}: #{e.message}")
        render json: { slots: [], mapped: false, error: "availability_unavailable" }
      end

      # Every eligible tech's open times for a service+date. Returns a per-provider
      # breakdown plus a merged list of all open times with who's free at each — so
      # the form can suggest another tech when the customer's pick is taken.
      #   { date:, mapped:, providers: [{ employee_id, name, photo_url, slots: [] }],
      #     by_time: { "HH:MM": [{ employee_id, name, photo_url }] } }
      def any
        service = Service.active.find_by(id: params[:service_id])
        date = parse_date(params[:date])
        if service.nil? || date.nil?
          return render json: { error: "service_id and a valid date are required" }, status: :bad_request
        end

        # Techs who perform this service AND are mapped to SimplyBook.
        techs = service.employee_profiles.select { |ep| ep.active? && ep.simplybook_unit_id.present? }
        if service.simplybook_event_id.blank? || techs.empty? || client.nil?
          return render json: { date: date.to_s, mapped: false, providers: [], by_time: {} }
        end

        providers = techs.map do |ep|
          slots = client.available_slots(
            service_id:  service.simplybook_event_id,
            provider_id: ep.simplybook_unit_id,
            date:        date,
            count:       slot_count
          )
          slots = filter_by_travel(ep, service, date, slots)
          { employee_id: ep.id, name: ep.user&.first_name, title: ep.title, photo_url: ep.photo_url, slots: slots }
        end

        # Invert to "who is free at each time".
        by_time = Hash.new { |h, k| h[k] = [] }
        providers.each do |p|
          p[:slots].each { |t| by_time[t] << { employee_id: p[:employee_id], name: p[:name], photo_url: p[:photo_url] } }
        end

        # If NOTHING is open that day, suggest the next date any tech has an
        # opening — so a fully-booked day isn't a dead end.
        next_date = by_time.empty? ? next_available_date(service, techs, date) : nil

        render json: {
          date: date.to_s, mapped: true, providers: providers,
          by_time: by_time.sort.to_h, next_available_date: next_date
        }
      rescue StandardError => e
        Rails.logger.warn("[AvailabilityController#any] #{e.class}: #{e.message}")
        render json: { date: date.to_s, mapped: false, providers: [], by_time: {}, error: "availability_unavailable" }
      end

      private

      # Earliest date any of the given techs has an opening for the service,
      # searching forward from `date`. Returns "YYYY-MM-DD" or nil.
      def next_available_date(service, techs, date)
        dates = techs.filter_map do |ep|
          client&.first_available_date(
            service_id:  service.simplybook_event_id,
            provider_id: ep.simplybook_unit_id,
            date:        date,
            count:       slot_count
          )
        end
        dates.min
      end

      # How many people are in the party (2..N for a group; 1 for everyone else).
      # A group is ONE technician doing the whole party in a single, longer visit —
      # it does NOT consume N parallel capacity seats. So party size affects the
      # visit's DURATION (below) and price, never SimplyBook's native `count`.
      def party_size
        [ params[:count].to_i, 1 ].max
      end

      # SimplyBook's native group-capacity `count`. We do NOT use native groups (a
      # group is one long booking on a qty=1 provider, not N concurrent seats), so
      # this is always 1 — availability is checked as an ordinary single booking.
      def slot_count = 1

      # Keep only slots this tech can physically reach given travel between their
      # adjacent jobs. Applied only when the customer's coordinates are known
      # (sent once the address is entered) — otherwise all SimplyBook slots pass.
      # Uses the SAME TravelFeasibility logic as the booking gate, so an offered
      # slot won't be rejected at booking time. A group occupies the tech for the
      # full party-extended duration, so travel is checked against that window.
      def filter_by_travel(employee, service, date, slots)
        lat, lng = customer_coords
        return slots if lat.nil? || lng.nil?

        tf = TravelFeasibility.new(employee: employee, customer_lat: lat, customer_lng: lng)
        duration = service.duration_minutes * party_size
        slots.select do |hhmm|
          # SimplyBook returns slot times in the company's local zone; parse them
          # there so the travel comparison lines up with the stored (UTC) bookings.
          starts_at = BusinessHours.parse_local("#{date} #{hhmm}")
          starts_at && tf.feasible?(starts_at, starts_at + duration.minutes)
        end
      end

      def customer_coords
        lat = params[:latitude].presence&.to_f
        lng = params[:longitude].presence&.to_f
        [ lat, lng ]
      end

      def client
        return nil if ENV["SIMPLYBOOK_COMPANY"].blank?
        @client ||= SimplyBook::Client.new
      end

      def mapped?(service, employee)
        service.simplybook_event_id.present? && employee.simplybook_unit_id.present?
      end

      def parse_date(raw)
        Date.iso8601(raw.to_s)
      rescue ArgumentError
        nil
      end
    end
  end
end
