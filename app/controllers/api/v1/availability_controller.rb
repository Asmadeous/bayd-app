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

      # Open times for a multi-service visit: every chosen service staffed,
      # back-to-back in the order given (VisitPlanner picks the techs).
      #   { date:, by_time: { "HH:MM": { single_tech:, lines: [...] } }, next_available_date: }
      def visit
        services = ordered_services
        date = parse_date(params[:date])
        if services.nil? || date.nil?
          return render json: { error: "1-#{VisitPlanner::MAX_SERVICES} active service_ids and a valid date are required" },
                        status: :bad_request
        end

        lat, lng = customer_coords
        opts = { services: services, customer_lat: lat, customer_lng: lng,
                 postal_code: params[:postal_code].presence, party_size: party_size,
                 ignore_booking_ids: own_visit_booking_ids }
        planner = VisitPlanner.new(date: date, **opts)
        by_time = planner.slots.transform_values do |plan|
          { single_tech: planner.single_tech?(plan), lines: plan.map { |line| visit_line_json(line) } }
        end
        next_date = VisitPlanner.first_available_date(from: date + 1, **opts) if by_time.empty?

        render json: { date: date.to_s, by_time: by_time, next_available_date: next_date&.to_s }
      rescue StandardError => e
        Rails.logger.warn("[AvailabilityController#visit] #{e.class}: #{e.message}")
        render json: { date: date.to_s, by_time: {}, error: "availability_unavailable" }
      end

      private

      # The requested services in the customer's order, or nil when any is
      # missing/inactive or there are none / too many.
      def ordered_services
        services = Service.active_in_order(params[:service_ids])
        services if services.present? && services.size <= VisitPlanner::MAX_SERVICES
      end

      # Rescheduling: the signed-in customer's own visit doesn't block itself.
      def own_visit_booking_ids
        return [] if params[:visit_id].blank? || optional_current_user.nil?

        optional_current_user.visits.find_by(id: params[:visit_id])&.bookings&.pluck(:id) || []
      end

      def visit_line_json(line)
        zone = BusinessHours.zone
        ep = line.employee
        { service_id: line.service.id, service_name: line.service.name,
          employee_id: ep.id, name: ep.user&.first_name, title: ep.title, photo_url: ep.photo_url,
          starts_at: line.starts_at.iso8601, ends_at: line.ends_at.iso8601,
          start_time: line.starts_at.in_time_zone(zone).strftime("%H:%M"),
          end_time: line.ends_at.in_time_zone(zone).strftime("%H:%M") }
      end

      # This tech's open "HH:MM" starts for the visit, from our engine. Travel is
      # filtered when the customer's coordinates are known (sent once the address
      # is entered) — the SAME TravelFeasibility the booking gate uses, so an
      # offered slot won't be rejected at booking time.
      def slots_for(employee, service, date)
        lat, lng = customer_coords
        AvailabilityEngine.new(
          employee: employee, service: service, date: date,
          party_size: party_size, extra_minutes: addon_minutes(service), customer_lat: lat, customer_lng: lng
        ).slots
      end

      # Earliest date any of the given techs has an opening for the service,
      # searching forward from `date`. Returns a Date or nil.
      def next_available_date(service, techs, date)
        lat, lng = customer_coords
        dates = techs.filter_map do |ep|
          AvailabilityEngine.first_available_date(
            employee: ep, service: service, from: date,
            party_size: party_size, extra_minutes: addon_minutes(service), customer_lat: lat, customer_lng: lng
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

      # Add-on time reserved in the same visit. Summed the same way
      # AssignmentService#addon_duration_minutes does, so an offered slot is one
      # the booking (service + add-ons) actually fits.
      def addon_minutes(service)
        @addon_minutes ||= begin
          ids = Array(params[:addon_service_ids]).map(&:to_i).uniq.reject { |id| id.zero? || id == service.id }
          ids.empty? ? 0 : Service.active.where(id: ids).sum(:duration_minutes)
        end
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
        lat, lng = customer_coords
        return true if postal.blank? && (lat.nil? || employee.service_radius_km.blank?)
        return true unless EmployeeProfile.coverage_configured?

        employee.serves_location?(postal_code: postal, latitude: lat, longitude: lng)
      end

      def parse_date(raw)
        Date.iso8601(raw.to_s)
      rescue ArgumentError
        nil
      end
    end
  end
end
