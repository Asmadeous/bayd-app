# Live check for the Helcim payment API.
#   bin/rails helcim:ping
#
# Calls HelcimPay initialize with a tiny amount — proves HELCIM_API_TOKEN works
# and the account can create a checkout session. Does NOT charge anything (it
# only creates a session token; no card is entered). No writes to our DB.
namespace :helcim do
  desc "Verify HELCIM_API_TOKEN by initializing a HelcimPay session (no charge)"
  task ping: :environment do
    abort "✗ HELCIM_API_TOKEN is blank" unless HelcimService.configured?

    print "POST /helcim-pay/initialize (amount 1.00 CAD) … "
    result = HelcimService.initialize_session(amount: 1.00, invoice_number: "PING-#{Time.now.to_i}")

    if result[:success] && result[:checkout_token].present?
      puts "OK"
      puts "   checkoutToken: #{result[:checkout_token][0, 16]}…"
      puts "   secretToken:   #{result[:secret_token].present? ? 'received' : 'MISSING'}"
      puts "\n✓ Helcim API reachable and the token works."
    else
      puts "FAILED"
      abort "   #{result[:error]}\n   → check HELCIM_API_TOKEN and that HelcimPay is enabled on the account."
    end
  end
end
