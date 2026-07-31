class EmployeeProfile < ApplicationRecord
  belongs_to :user
  belongs_to :partner, optional: true

  has_one  :employee_current_location, dependent: :destroy
  has_many :location_pings, dependent: :destroy
  has_many :shifts, dependent: :destroy
  has_many :employee_services, dependent: :destroy
  has_many :services, through: :employee_services
  has_many :employee_service_areas, dependent: :destroy
  has_many :service_areas, through: :employee_service_areas
  has_many :bookings, dependent: :restrict_with_error
  has_many :tips, dependent: :restrict_with_error
  has_many :assignment_attempts, foreign_key: :chosen_employee_id, dependent: :nullify
  has_many :reviews, dependent: :nullify

  validates :user, presence: true
  validates :simplybook_unit_id, uniqueness: true, allow_nil: true
  validates :traccar_device_id, uniqueness: true, allow_nil: true

  before_validation :normalize_service_fsas

  scope :active,       -> { where(active: true) }
  scope :on_shift,     -> { where(on_shift: true) }
  scope :dispatchable, -> { where(dispatchable: true) }
  scope :serving_fsa,  ->(fsa) { where("service_fsas @> ARRAY[?]::text[]", fsa) }

  # ── Coverage (per-provider FSA lists) ──────────────────────────────────────

  # Has any provider defined the FSAs they serve yet?
  def self.coverage_configured?
    where("array_length(service_fsas, 1) > 0").exists?
  end

  # Does the company serve this postal code / FSA?
  # Fails closed once coverage is configured: an unknown FSA is not served.
  # Unrestricted only when no provider has any FSAs set yet.
  def self.covers?(postal_or_fsa)
    return true unless coverage_configured?

    fsa = PostalCode.fsa(postal_or_fsa)
    return false if fsa.blank?

    active.serving_fsa(fsa).exists?
  end

  # FSAs served by any active provider (the company's coverage map).
  def self.covered_fsas
    active.flat_map(&:service_fsas).uniq.sort
  end

  def serves_fsa?(postal_or_fsa)
    fsa = PostalCode.fsa(postal_or_fsa)
    fsa.present? && service_fsas.include?(fsa)
  end

  def available_at?(starts_at, ends_at)
    !bookings.where(status: %w[confirmed in_progress])
             .where("starts_at < ? AND ends_at > ?", ends_at, starts_at)
             .exists?
  end

  def current_shift
    shifts.status_open.recent.first
  end

  def clocked_in?
    shifts.status_open.exists?
  end

  def live_location_fresh?(staleness_threshold: 5.minutes)
    return false unless employee_current_location
    employee_current_location.recorded_at >= staleness_threshold.ago
  end

  private

  def normalize_service_fsas
    self.service_fsas = PostalCode.normalize_fsa_list(service_fsas)
  end
end
