class EmployeeProfile < ApplicationRecord
  has_one_attached :photo
  belongs_to :user
  belongs_to :partner, optional: true

  has_one  :employee_current_location, dependent: :destroy
  has_many :location_pings, dependent: :destroy
  has_many :shifts, dependent: :destroy
  has_many :availability_schedules, dependent: :destroy
  has_many :availability_overrides, dependent: :destroy
  has_many :employee_services, dependent: :destroy
  has_many :services, through: :employee_services
  has_many :employee_service_areas, dependent: :destroy
  has_many :service_areas, through: :employee_service_areas
  has_many :bookings, dependent: :restrict_with_error
  has_many :tips, dependent: :restrict_with_error
  has_many :assignment_attempts, foreign_key: :chosen_employee_id, dependent: :nullify
  has_many :reviews, dependent: :nullify

  validates :user, presence: true

  before_validation :normalize_service_fsas

  # A partner provider's compensation flows through the partner payout split; a
  # direct (solo) tech is paid individually (tips + fuel reimbursement). This
  # governs which earnings surfaces they see - the two never mix.
  def partner_provider? = partner_id.present?
  def direct_staff?     = partner_id.blank?

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
    within_bookable_hours?(starts_at, ends_at) &&
      !bookings.where(status: %w[confirmed in_progress])
               .where("starts_at < ? AND ends_at > ?", ends_at, starts_at)
               .exists?
  end

  # Does the whole [starts_at, ends_at) visit fall inside this tech's bookable
  # hours for that date — the weekly template, with a date override winning?
  # Mirrors AvailabilityEngine#bookable_windows so what's offered == what's
  # bookable. Times are compared in the company zone (BusinessHours).
  def within_bookable_hours?(starts_at, ends_at)
    date = starts_at.in_time_zone(BusinessHours.zone).to_date
    windows = bookable_windows_for(date)
    windows.any? { |ws, we| starts_at >= ws && ends_at <= we }
  end

  # [[start_instant, end_instant], ...] this tech is bookable on `date`.
  def bookable_windows_for(date)
    override = availability_overrides.find_by(date: date)
    if override
      return [] unless override.available?
      return [ window_on(date, override.start_time, override.end_time) ] if override.partial_day?
    end

    availability_schedules.where(day_of_week: date.wday)
                          .map { |s| window_on(date, s.start_time, s.end_time) }
  end

  private

  def window_on(date, start_time, end_time)
    zone = BusinessHours.zone
    [ zone.local(date.year, date.month, date.day, start_time.hour, start_time.min),
      zone.local(date.year, date.month, date.day, end_time.hour, end_time.min) ]
  end

  public

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
