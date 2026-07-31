# Live checks for the two Google integrations.
#   bin/rails google:ping    → geocode a known address (proves GOOGLE_MAPS_API_KEY + Geocoding API)
#   bin/rails google:oauth   → config sanity for the OAuth code flow (no browser test possible here)
namespace :google do
  desc "Verify GOOGLE_MAPS_API_KEY by geocoding a known address"
  task ping: :environment do
    key = ENV.fetch("GOOGLE_MAPS_API_KEY", "")
    abort "✗ GOOGLE_MAPS_API_KEY is blank" if key.blank?

    print "Geocoding '1 Yonge St, Toronto' … "
    results = Geocoder.search("1 Yonge Street, Toronto, ON")
    coords  = results.first&.coordinates
    if coords
      puts "OK → #{coords.map { |c| c.round(5) }.join(', ')}"
      puts "\n✓ Geocoding API reachable and the key works."
    else
      puts "FAILED (no result)"
      abort "   → enable the **Geocoding API** for this key and check API/IP restrictions in Google Console."
    end
  rescue StandardError => e
    puts "FAILED"
    abort "   #{e.class}: #{e.message}"
  end

  desc "Config sanity for Google OAuth (code flow) — cannot browser-test here"
  task oauth: :environment do
    id     = ENV.fetch("GOOGLE_CLIENT_ID", "")
    secret = ENV.fetch("GOOGLE_CLIENT_SECRET", "")
    uri    = ENV.fetch("GOOGLE_REDIRECT_URI", "")

    puts "GOOGLE_CLIENT_ID:     #{id.present? ? "#{id[0, 12]}… (#{id.end_with?('.apps.googleusercontent.com') ? 'looks valid' : 'MISSING .apps.googleusercontent.com suffix'})" : '✗ BLANK'}"
    puts "GOOGLE_CLIENT_SECRET: #{secret.present? ? "set (#{secret.length} chars)" : '✗ BLANK'}"
    puts "GOOGLE_REDIRECT_URI:  #{uri.present? ? uri : '✗ BLANK'}"
    puts
    puts "This exact redirect URI must be listed under Authorized redirect URIs in"
    puts "Google Console for the same OAuth client. Test end-to-end in a browser:"
    puts "  visit  <API_HOST>/api/v1/auth/google  → Google consent → back to <APP_URL>/auth/callback"
    abort "✗ One or more values are blank." if [ id, secret, uri ].any?(&:blank?)
    puts "\n✓ All three OAuth values are present."
  end
end
