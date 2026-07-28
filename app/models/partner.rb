class Partner < ApplicationRecord
  has_many :employee_profiles, dependent: :nullify
  has_many :bookings, dependent: :nullify
  has_many :partner_payouts, dependent: :destroy

  enum :status, { active: "active", inactive: "inactive" }, prefix: true

  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true
  validates :platform_fee_pct, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }

  before_validation :assign_slug, on: :create

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
