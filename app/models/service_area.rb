class ServiceArea < ApplicationRecord
  has_many :employee_service_areas, dependent: :destroy
  has_many :employee_profiles, through: :employee_service_areas

  validates :name, :slug, presence: true
  validates :slug, uniqueness: true
  validates :travel_fee, numericality: { greater_than_or_equal_to: 0 }
  validates :radius_meters, numericality: { greater_than: 0 }, allow_nil: true

  # Store postal codes in canonical form ("M5V2T6") so matching is exact.
  before_validation :normalize_postal_codes

  scope :active, -> { where(active: true) }

  # Active zones that actually define a bookable boundary (a postal-code list).
  scope :configured_for_coverage, -> { active.where("array_length(postal_codes, 1) > 0") }

  # Active zones whose postal list contains the given (already-normalized) code.
  # Uses the GIN index via the array-contains operator.
  scope :covering_postal, ->(code) { active.where("postal_codes @> ARRAY[?]::text[]", code) }

  # Is this postal code inside the company's bookable area?
  # Once any zone is configured, coverage is strictly postal: an unknown or
  # unresolvable code is NOT covered (no distance/GPS fallback). Only when no
  # zones exist at all (nothing set up yet) is service unrestricted.
  def self.covers?(postal_code:)
    return true unless configured_for_coverage.exists?

    code = PostalCode.normalize(postal_code)
    return false if code.blank?

    covering_postal(code).exists?
  end

  private

  def normalize_postal_codes
    self.postal_codes = PostalCode.normalize_list(postal_codes)
  end
end
