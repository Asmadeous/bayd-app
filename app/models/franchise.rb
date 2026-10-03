# One branch of the business, usually a country. Everything a country differs on
# is data here (zone, hours, currency, tax, contacts, domains, payments), entered
# by the super admin, so adding a country needs no code or deploy.
class Franchise < ApplicationRecord
  enum :status, { draft: "draft", live: "live", suspended: "suspended" }, prefix: true

  has_many :users, dependent: :restrict_with_error

  # Card on file, payment links and webhooks go through this franchise's own
  # Square account.
  GATEWAYS = %w[square].freeze
  # The keys Square needs, entered in the super admin console and only ever
  # shown back as present/missing.
  CREDENTIAL_KEYS = {
    "square" => %w[access_token location_id application_id environment webhook_signature_key]
  }.freeze
  # The default franchise keeps using the deploy's env keys until its own are entered.
  ENV_FALLBACK = {
    "square" => { "access_token" => "SQUARE_ACCESS_TOKEN", "location_id" => "SQUARE_LOCATION_ID",
                  "application_id" => "SQUARE_APPLICATION_ID", "environment" => "SQUARE_ENVIRONMENT",
                  "webhook_signature_key" => "SQUARE_WEBHOOK_SIGNATURE_KEY" }
  }.freeze

  encrypts :gateway_credentials

  SLUG_FORMAT = /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/
  HOST_FORMAT = /\A[a-z0-9]+([.-][a-z0-9]+)*\z/

  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true, format: { with: SLUG_FORMAT }
  validates :country_code, format: { with: /\A[A-Z]{2}\z/ }
  validates :currency, format: { with: /\A[A-Z]{3}\z/ }
  validates :time_zone, inclusion: { in: ->(_) { TZInfo::Timezone.all_identifiers } }
  validates :open_hour, :close_hour, numericality: { only_integer: true, in: 0..24 }
  validates :tax_rate, numericality: { in: 0..1 }
  validates :royalty_pct, numericality: { in: 0..100 }
  validates :payment_gateway, inclusion: { in: GATEWAYS }
  validates :subdomain, uniqueness: true, format: { with: SLUG_FORMAT }, allow_blank: true
  validates :custom_domain, uniqueness: true, format: { with: HOST_FORMAT }, allow_blank: true
  validate :opens_before_close

  before_validation :normalize
  after_commit { FranchiseOrigins.reset! }

  # The franchise everything belongs to when nothing else says otherwise
  # (today's Canada business). Created on first use where the migration's row
  # doesn't exist (fresh test databases).
  def self.default
    find_by(is_default: true) || create!(name: "B.A.Y.D Canada", slug: "canada", status: "live", is_default: true,
                                         tax_name: "HST", tax_rate: 0.13, staff_email_domain: "baydspa.ca")
  end

  # The live franchise a website host belongs to: "<subdomain>.<base domain>" or
  # its own custom domain.
  def self.for_host(host)
    host = host.to_s.downcase.sub(/\Awww\./, "")
    return if host.blank?

    status_live.find_by(custom_domain: host) ||
      status_live.find_by(subdomain: host.split(".").first) if host.include?(".")
  end

  def zone = ActiveSupport::TimeZone[time_zone]

  # The franchise this code is working in, or the default outside any request.
  def self.current = Current.franchise || default

  # Symbols for common currencies; any other prints its code ("XYZ 10.00"), so
  # a new country works without a code change.
  CURRENCY_SYMBOLS = {
    "CAD" => "$", "USD" => "$", "AUD" => "$", "NZD" => "$", "GBP" => "£", "EUR" => "€", "JPY" => "¥",
    "INR" => "₹", "NGN" => "₦", "ZAR" => "R", "KES" => "KSh ", "AED" => "AED ", "CHF" => "CHF "
  }.freeze
  # ISO 4217 currencies with no minor unit (amounts are whole numbers).
  ZERO_DECIMAL = %w[JPY KRW VND CLP ISK UGX XAF XOF RWF].freeze

  def currency_symbol = CURRENCY_SYMBOLS.fetch(currency, "#{currency} ")

  def money(amount)
    ActiveSupport::NumberHelper.number_to_currency(amount.to_d, unit: currency_symbol,
                                                                precision: ZERO_DECIMAL.include?(currency) ? 0 : 2)
  end

  # Amount in the currency's smallest unit, as payment providers take it.
  def minor_units(amount) = (amount.to_d * minor_factor).round.to_i

  def from_minor_units(units) = units.to_d / minor_factor

  def minor_factor = ZERO_DECIMAL.include?(currency) ? 1 : 100

  def display_name = sender_name.presence || "Beauty @ Your Door"

  def credentials
    JSON.parse(gateway_credentials.presence || "{}")
  rescue JSON::ParserError
    {}
  end

  # Merge new keys for a provider; blank values leave the stored key as it is,
  # so one key can be changed without re-entering the rest.
  def update_credentials!(provider, values)
    allowed = CREDENTIAL_KEYS.fetch(provider.to_s)
    current = credentials
    entry = current.fetch(provider.to_s, {})
    values.to_h.each { |key, value| entry[key.to_s] = value.to_s.strip if allowed.include?(key.to_s) && value.present? }
    update!(gateway_credentials: current.merge(provider.to_s => entry).to_json)
  end

  def credential(provider, key)
    credentials.dig(provider.to_s, key.to_s).presence ||
      (is_default && (env = ENV_FALLBACK.dig(provider.to_s, key.to_s)) ? ENV[env].presence : nil)
  end

  def payments_configured? = %w[access_token location_id].all? { |k| credential("square", k).present? }

  # What must be in place before customers can see this franchise.
  def readiness
    in_franchise = ->(&blk) { Current.set(franchise: self, &blk) }
    {
      admin: users.where(role: "admin").exists?,
      payments: payments_configured?,
      services: in_franchise.call { Service.active.exists? },
      technicians: in_franchise.call { EmployeeProfile.active.exists? },
      legal: is_default || (privacy_body.present? && terms_body.present?)
    }
  end

  def ready_to_go_live? = readiness.values.all?

  # { "square" => { "access_token" => true, ... } } - never the values.
  def credential_status
    CREDENTIAL_KEYS.to_h { |provider, keys| [ provider, keys.index_with { |key| credential(provider, key).present? } ] }
  end

  def website = custom_domain.presence || (subdomain && "#{subdomain}.#{self.class.base_domain}")

  # Every web origin this franchise's site is served from (for CORS).
  def web_origins
    hosts = [ custom_domain.presence, subdomain.presence && "#{subdomain}.#{self.class.base_domain}" ].compact
    hosts.flat_map { |h| [ "https://#{h}", "https://www.#{h}" ] }
  end

  def self.base_domain = ENV.fetch("FRANCHISE_BASE_DOMAIN", "baydspa.ca")

  # What any visitor may see (no credentials, no royalty).
  def public_config
    {
      slug: slug, name: name, status: status, country_code: country_code, currency: currency,
      locale: locale, time_zone: time_zone, open_hour: open_hour, close_hour: close_hour,
      tax_name: tax_name, tax_rate: tax_rate, contact_email: contact_email, contact_phone: contact_phone,
      business_address: business_address,
      staff_email_domain: staff_email_domain.presence || User::DEFAULT_STAFF_EMAIL_DOMAIN,
      has_privacy: privacy_body.present?, has_terms: terms_body.present?,
      # Browser-safe ids the card form loads Square's SDK with (no secrets).
      payments: {
        square_application_id: credential("square", "application_id"),
        square_location_id: credential("square", "location_id")
      }
    }
  end

  private

  def normalize
    self.slug = slug.to_s.strip.downcase.presence || name.to_s.parameterize.presence
    self.country_code = country_code.to_s.strip.upcase
    self.currency = currency.to_s.strip.upcase
    self.subdomain = subdomain.to_s.strip.downcase.presence
    self.custom_domain = custom_domain.to_s.strip.downcase.sub(%r{\Ahttps?://}, "").sub(%r{/.*\z}, "").presence
    self.staff_email_domain = staff_email_domain.to_s.strip.downcase.delete_prefix("@").presence
  end

  def opens_before_close
    return if open_hour.nil? || close_hour.nil? || open_hour < close_hour

    errors.add(:close_hour, "must be after the opening hour")
  end
end
