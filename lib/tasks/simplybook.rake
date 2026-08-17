# Live connectivity check for the SimplyBook.me admin API.
#   bin/rails simplybook:ping
#
# Exercises the real calls the app depends on (auth → list bookings) and prints
# a pass/fail per step so a broken credential or endpoint is obvious. Reads the
# same ENV the app uses (SIMPLYBOOK_COMPANY / LOGIN / API_USER_KEY). Makes no
# writes — it does not create or cancel anything.
namespace :simplybook do
  desc "Verify SimplyBook admin API auth + a read call (no writes)"
  task ping: :environment do
    company = ENV.fetch("SIMPLYBOOK_COMPANY", "")
    login   = ENV.fetch("SIMPLYBOOK_LOGIN", "")
    key     = ENV.fetch("SIMPLYBOOK_API_USER_KEY", "")

    abort "✗ SIMPLYBOOK_COMPANY is blank"        if company.blank?
    abort "✗ SIMPLYBOOK_LOGIN is blank"          if login.blank?
    abort "✗ SIMPLYBOOK_API_USER_KEY is blank"   if key.blank?
    puts "company=#{company}  login=#{login}  key=#{key[0, 16]}…"

    # Step 1 — auth. Build the client (its initializer calls POST /admin/auth).
    print "1) POST /admin/auth … "
    client =
      begin
        c = SimplyBook::Client.new
        puts "OK (token acquired)"
        c
      rescue StandardError => e
        puts "FAILED\n   #{e.class}: #{e.message}"
        abort "   → check SIMPLYBOOK_LOGIN (user login, not the .simplybook.me domain) and the API user key."
      end

    # Step 2 — a read call. Lists bookings for a small recent window.
    print "2) GET /admin/bookings … "
    begin
      list = client.bookings(date_from: Date.current - 7, date_to: Date.current + 30)
      rows = Array(list)
      puts "OK (#{rows.size} booking(s) in the last 7 / next 30 days)"
      if (first = rows.first)
        puts "   sample: id=#{first['id']} start=#{first['start_datetime']} " \
             "service_id=#{first['service_id']} provider_id=#{first['provider_id']}"
      end
    rescue StandardError => e
      puts "FAILED\n   #{e.class}: #{e.message}"
      abort "   → auth worked but the read call failed; the endpoint/field contract is off."
    end

    puts "\n✓ SimplyBook admin API reachable and authenticated."
  end

  # Mirror our services + techs into SimplyBook and capture the ids, so bookings
  # route to the CORRECT tech/service. Populates Service#simplybook_event_id and
  # EmployeeProfile#simplybook_unit_id. Idempotent: skips anything already mapped,
  # and reuses a SimplyBook record with a matching name instead of duplicating.
  #
  #   bin/rails simplybook:sync_mapping        # do it
  #   DRY_RUN=1 bin/rails simplybook:sync_mapping   # show what it would do
  desc "Create/link SimplyBook providers & services, storing ids for correct-tech routing"
  task sync_mapping: :environment do
    abort "✗ SIMPLYBOOK_COMPANY is blank" if ENV["SIMPLYBOOK_COMPANY"].blank?
    dry = ENV["DRY_RUN"].present?
    client = SimplyBook::Client.new

    # 1) Services first (providers reference service ids). Reuse-by-name → create.
    puts "── Services ──"
    Service.active.find_each do |svc|
      if svc.simplybook_event_id.present?
        puts "  = #{svc.name} (already #{svc.simplybook_event_id})"
        next
      end
      sid = client.find_service_id(name: svc.name)
      unless sid
        if dry
          puts "  + would create service: #{svc.name} (#{svc.duration_minutes}min)"
          next
        end
        begin
          sid = client.create_service(name: svc.name, duration: svc.duration_minutes, price: svc.price.to_f)
        rescue StandardError => e
          puts "  ✗ #{svc.name} — #{e.message}"
          next
        end
      end
      if sid
        svc.update_columns(simplybook_event_id: sid) unless dry
        puts "  #{dry ? '~' : '✓'} #{svc.name} → #{sid}"
      else
        puts "  ✗ failed (no id): #{svc.name}"
      end
    end

    # 2) Providers, each linked to the SimplyBook ids of the services they perform.
    puts "── Providers (techs) ──"
    EmployeeProfile.includes(:user, :services).find_each do |ep|
      name = [ ep.user.first_name, ep.user.last_name ].compact.join(" ").strip.presence || ep.user.email
      if ep.simplybook_unit_id.present?
        puts "  = #{name} (already #{ep.simplybook_unit_id})"
        next
      end
      service_ids = ep.services.map(&:simplybook_event_id).compact
      pid = client.find_provider_id(name: name)
      unless pid
        if dry
          puts "  + would create provider: #{name} (#{service_ids.size} services)"
          next
        end
        begin
          pid = client.create_provider(name: name, email: ep.user.email, phone: ep.user.phone, service_ids: service_ids)
        rescue StandardError => e
          puts "  ✗ #{name} — #{e.message}"
          next
        end
      end
      if pid
        ep.update_columns(simplybook_unit_id: pid) unless dry
        puts "  #{dry ? '~' : '✓'} #{name} → #{pid}"
      else
        puts "  ✗ failed (no id): #{name}"
      end
    end

    puts "\n#{dry ? 'DRY RUN — nothing written.' : 'Done.'} " \
         "Mapped services: #{Service.where.not(simplybook_event_id: nil).count}/#{Service.active.count}, " \
         "techs: #{EmployeeProfile.where.not(simplybook_unit_id: nil).count}/#{EmployeeProfile.count}"
  end

  # Link each mapped tech to the SimplyBook services they perform. Providers can
  # be created without services attached, which makes SimplyBook return ZERO
  # available slots (it thinks the tech performs nothing). This pushes each tech's
  # service ids onto their SimplyBook provider so availability works. Idempotent.
  #
  #   bin/rails simplybook:sync_provider_services
  #   DRY_RUN=1 bin/rails simplybook:sync_provider_services   # show, write nothing
  desc "Link each SimplyBook provider to the services they perform (fixes empty availability)"
  task sync_provider_services: :environment do
    abort "✗ SIMPLYBOOK_COMPANY is blank" if ENV["SIMPLYBOOK_COMPANY"].blank?
    dry = ENV["DRY_RUN"].present?
    client = SimplyBook::Client.new

    EmployeeProfile.includes(:user, :services).where.not(simplybook_unit_id: nil).find_each do |ep|
      name = [ ep.user&.first_name, ep.user&.last_name ].compact.join(" ").strip.presence || ep.user&.email
      service_ids = ep.services.map(&:simplybook_event_id).compact
      if service_ids.empty?
        puts "  – #{name}: no mapped services on our side, skipping"
        next
      end
      if dry
        puts "  ~ would link #{name} (unit #{ep.simplybook_unit_id}) → #{service_ids.size} services"
        next
      end
      begin
        client.update_provider_services(provider_id: ep.simplybook_unit_id, service_ids: service_ids)
        puts "  ✓ #{name} (unit #{ep.simplybook_unit_id}) → #{service_ids.size} services"
      rescue StandardError => e
        puts "  ✗ #{name} — #{e.message}"
      end
    end

    puts "\n#{dry ? 'DRY RUN — nothing written.' : 'Done. Availability should now return slots for mapped techs.'}"
  end

  # Register our webhook in SimplyBook so app/PWA bookings (create, change,
  # cancel) flow back into our system. Without this, a customer rebooking in the
  # SimplyBook app never reaches us. Idempotent — skips events already registered.
  #
  #   WEBHOOK_URL=https://api.baydspa.ca/api/v1/webhooks/simplybook \
  #     bin/rails simplybook:register_webhook
  desc "Register the inbound webhook in SimplyBook (app bookings → our system)"
  task register_webhook: :environment do
    abort "✗ SIMPLYBOOK_COMPANY is blank" if ENV["SIMPLYBOOK_COMPANY"].blank?
    url = ENV["WEBHOOK_URL"].presence ||
          "https://#{ENV.fetch('APP_HOST', 'api.baydspa.ca')}/api/v1/webhooks/simplybook"
    client = SimplyBook::Client.new

    # SimplyBook's valid booking-notification events (verified against the live
    # account): new_booking + change_booking (create/reschedule) and
    # cancel_booking (cancellation).
    %w[new_booking change_booking cancel_booking].each do |event|
      id = client.register_webhook(url: url, event: event)
      puts "  ✓ #{event} → webhook #{id} (#{url})"
    rescue StandardError => e
      puts "  ✗ #{event} — #{e.message}"
    end

    puts "\nRegistered webhooks now in SimplyBook:"
    client.webhooks.each { |w| puts "  ##{w['id']} #{w['event']} → #{w['url']}" }
  end
end
