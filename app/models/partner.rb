class Partner < ApplicationRecord
  has_many :employee_profiles, dependent: :nullify
  has_many :bookings, dependent: :nullify
  has_many :partner_payouts, dependent: :destroy

  enum :status, { active: "active", inactive: "inactive" }, prefix: true

  validates :name, presence: true
  # Email is the partner's provider login (staff_login), so it's required and
  # must be unique across all users — surfaced clearly at create time.
  validates :email, presence: true
  validates :slug, presence: true, uniqueness: true
  validates :platform_fee_pct, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }

  before_validation :assign_slug, on: :create

  # The single EmployeeProfile that represents this partner as a bookable
  # provider (a partner may in theory have several employee_profiles, but we
  # auto-create and manage exactly one "org" provider — the first).
  def provider
    employee_profiles.order(:created_at).first
  end

  # Create this partner's bookable provider (partner-role User + EmployeeProfile
  # linked back via partner_id), unless one already exists. The provider is
  # created active + dispatchable but stays DORMANT (no availability) until an
  # admin sets its coverage FSAs + services on the Employees page. Idempotent.
  # Self-contained — the employee-creation flow is deliberately kept separate.
  def ensure_provider!(password: nil)
    return provider if provider.present?

    profile = nil
    transaction do
      user = User.new(email: email, first_name: name, phone: phone, role: :partner)
      user.password = password.presence || SecureRandom.alphanumeric(14)
      user.save!
      profile = employee_profiles.create!(
        user: user, title: "#{name} (Partner)", active: true, dispatchable: true
      )
    end
    profile
  end

  # Deactivate this partner's provider so it stops taking bookings, without
  # destroying it (bookings/payout history depend on the profile). Used on
  # partner deletion instead of a hard delete.
  def deactivate_provider!
    provider&.update!(active: false, dispatchable: false)
  end

  # Bookings completed by this partner's providers that haven't been paid out.
  def unsettled_bookings
    bookings.where(status: "completed", partner_payout_id: nil)
  end

  # Union of FSAs served by this partner's active providers.
  def covered_fsas
    employee_profiles.select(&:active?).flat_map(&:service_fsas).uniq.sort
  end

  def partner_share_pct
    100 - platform_fee_pct
  end

  # Snapshot of what's currently owed (not yet settled).
  def pending_earnings
    gross = unsettled_bookings.sum(:total)
    fee   = (gross * platform_fee_pct / 100).round(2)
    { booking_count: unsettled_bookings.count, gross: gross, fee: fee, owed: (gross - fee).round(2) }
  end

  # Settle all currently-unsettled completed bookings into one payout batch.
  def settle_pending!
    payout = nil
    transaction do
      scope = unsettled_bookings
      gross = scope.sum(:total)
      fee   = (gross * platform_fee_pct / 100).round(2)
      payout = partner_payouts.create!(
        booking_count: scope.count, gross: gross, fee_amount: fee,
        amount: (gross - fee).round(2), platform_fee_pct: platform_fee_pct, status: "pending"
      )
      scope.update_all(partner_payout_id: payout.id, updated_at: Time.current)
    end
    payout
  end

  private

  def assign_slug
    base = name.to_s.parameterize.presence || "partner"
    candidate = base
    i = 1
    candidate = "#{base}-#{i += 1}" while Partner.exists?(slug: candidate)
    self.slug = candidate
  end
end
