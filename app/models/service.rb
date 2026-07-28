class Service < ApplicationRecord
  # Booking client types. "adult" is the base price; the others can override it.
  CLIENT_TYPES = %w[adult kids elderly group].freeze
  # Number of people a "group" booking covers (flat group price).
  GROUP_SIZE = 5

  belongs_to :service_category

  has_many :employee_services, dependent: :destroy
  has_many :employee_profiles, through: :employee_services
  has_many :booking_requests, dependent: :restrict_with_error
  has_many :bookings, dependent: :restrict_with_error

  validates :name, presence: true
  validates :duration_minutes, numericality: { greater_than: 0 }
  validates :price, numericality: { greater_than_or_equal_to: 0 }
  validates :simplybook_event_id, uniqueness: true, allow_nil: true

  scope :active, -> { where(active: true) }

  # Price for a given client type, falling back to the base price when no
  # override is set (or the type is unknown / "adult").
  def price_for(client_type)
    ct = client_type.to_s
    return price unless CLIENT_TYPES.include?(ct) && ct != "adult"

    override = tier_prices[ct]
    override.present? ? BigDecimal(override.to_s) : price
  end

  # Full {adult:, kids:, elderly:, group:} map — handy for the booking UI.
  def prices
    CLIENT_TYPES.index_with { |ct| price_for(ct) }
  end

  # Replace the tier overrides from an admin-supplied {type => price} hash.
  # Only non-adult, non-blank, non-negative values are kept.
  def tier_prices_from(hash)
    self.tier_prices = (hash || {}).each_with_object({}) do |(type, value), acc|
      key = type.to_s
      next unless CLIENT_TYPES.include?(key) && key != "adult"

      num = value.to_s.strip
      acc[key] = num.to_f if num.present? && num.to_f >= 0
    end
  end
end
