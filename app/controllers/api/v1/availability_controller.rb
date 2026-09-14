module Api
  module V1
    # Public availability checks used by the booking form so customers pick a real
    # open slot (computed by our own AvailabilityEngine from each tech's bookable
    # hours minus their bookings and travel time) instead of typing any date/time.
    #
    #   GET /availability          → one tech's open times for a service+date
    #   GET /availability/any      → every tech's open times for a service+date,
    #                                so the UI can auto-shift to whoever is free
    #                                ("Susi's booked at 2pm — Claire is free then").
    class AvailabilityController < ApplicationController
      skip_before_action :authenticate_user!

      # One specific tech's open times. { slots:, mapped:, date: }
      # `mapped` is kept for backwards compatibility with the booking form: it now
      # means "this tech performs the service" (there's no external mapping).
      def show
        service = Service.active.find_by(id: params[:service_id])
        employee = EmployeeProfile.active.find_by(id: params[:employee_id])
        date = parse_date(params[:date])

        if service.nil? || employee.nil? || date.nil?
          return render json: { error: "service_id, employee_id and a valid date are required" },
                        status: :bad_request
        end

        return render json: { slots: [], mapped: false } unless performs?(employee, service)
        # Mirror the booking gate: a tech who doesn't cover the customer's FSA can't
        # take the job, so offer no slots rather than slots that fail at booking.
        return render json: { slots: [], mapped: true, date: date.to_s } unless serves_customer_fsa?(employee)

        render json: { slots: slots_for(employee, service, date), mapped: true, date: date.to_s }
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

        techs = service.employee_profiles.select { |ep| ep.active? && serves_customer_fsa?(ep) }
        return render json: { date: date.to_s, mapped: false, providers: [], by_time: {} } if techs.empty?

        providers = techs.map do |ep|
          { employee_id: ep.id, name: ep.user&.first_name, title: ep.title, photo_url: ep.photo_url,
            slots: slots_for(ep, service, date) }
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

      # This tech's open "HH:MM" starts for the visit, from our engine. Travel is
      # filtered when the customer's coordinates are known (sent once the address
      # is entered) — the SAME TravelFeasibility the booking gate uses, so an
      # offered slot won't be rejected at booking time.
      def slots_for(employee, service, date)
        lat, lng = customer_coords
        AvailabilityEngine.new(
          employee: employee, service: service, date: date,
          party_size: party_size, customer_lat: lat, customer_lng: lng
        ).slots
      end

      # Earliest date any of the given techs has an opening for the service,
      # searching forward from `date`. Returns a Date or nil.
      def next_available_date(service, techs, date)
        lat, lng = customer_coords
        dates = techs.filter_map do |ep|
          AvailabilityEngine.first_available_date(
            employee: ep, service: service, from: date,
            party_size: party_size, customer_lat: lat, customer_lng: lng
          )
        end
        dates.min
      end

      # How many people are in the party (2..N for a group; 1 for everyone else).
      # A group is ONE technician doing the whole party in a single, longer visit,
      # so party size scales the visit DURATION (in the engine), never a count.
      def party_size
        [ params[:count].to_i, 1 ].max
      end

      def performs?(employee, service)
        employee.services.exists?(id: service.id)
      end

      def customer_coords
        lat = params[:latitude].presence&.to_f
        lng = params[:longitude].presence&.to_f
        [ lat, lng ]
      end

      # Does this tech cover the customer's FSA? Mirrors AssignmentService's
      # serves_customer_postal? so offered slots match what's bookable. When the
      # client hasn't sent a postal yet (no address entered), don't restrict —
      # the booking gate still enforces coverage on submit.
      def serves_customer_fsa?(employee)
        postal = params[:postal_code].presence
        return true if postal.blank?
        return true unless EmployeeProfile.coverage_configured?

        employee.serves_fsa?(postal)
      end

      def parse_date(raw)
        Date.iso8601(raw.to_s)
      rescue ArgumentError
        nil
      end
    end
  end
end
