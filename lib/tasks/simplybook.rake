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
end
