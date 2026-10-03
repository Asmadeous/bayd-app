# A franchise for the super admin console: its whole setup, whether each payment
# key is present (never the keys), readiness and its admins.
class FranchiseSerializer < Blueprinter::Base
  identifier :id
  fields :name, :slug, :status, :is_default, :country_code, :currency, :locale, :time_zone, :open_hour, :close_hour,
         :tax_name, :tax_rate, :tax_registration_number, :contact_email, :contact_phone, :reply_to_email,
         :sender_name, :sms_sender, :staff_email_domain, :subdomain, :custom_domain,
         :royalty_pct, :privacy_body, :terms_body, :business_address, :created_at

  field(:credential_status, &:credential_status)
  field(:readiness, &:readiness)
  field(:web_origins, &:web_origins)

  field :admins do |franchise|
    franchise.users.where(role: "admin", deleted_at: nil).order(:created_at).map do |u|
      { id: u.id, email: u.email, first_name: u.first_name, last_name: u.last_name, created_at: u.created_at }
    end
  end

  field :webhook_urls do |franchise|
    base = ENV.fetch("API_URL", "https://api.baydspa.ca")
    { square: "#{base}/api/v1/webhooks/square/#{franchise.slug}" }
  end
end
