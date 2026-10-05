class GiftCard < ApplicationRecord
  belongs_to :purchaser, class_name: "User", optional: true
  has_many :gift_card_transactions, dependent: :restrict_with_error
  has_one  :invoice, as: :invoiceable, dependent: :nullify

  validates :code, presence: true, uniqueness: true
  validates :initial_balance, :current_balance, numericality: { greater_than_or_equal_to: 0 }

  before_validation :assign_code, on: :create

  scope :active, -> { where(active: true) }

  # Deliver immediately only for cards that are already active (admin-issued).
  # Customer purchases are created inactive and delivered on payment (mark_paid!).
  after_create_commit :on_purchase, if: -> { active? && (purchaser_id.present? || recipient_email.present?) }

  def ensure_invoice
    Invoice.generate_for(self) unless invoice
  end

  # Send the designed card + code to the recipient (or buyer). Used on purchase
  # and by the admin "send to user" action.
  def deliver!
    GiftCardMailer.delivery(self).deliver_later
  end

  # Payment confirmed (webhook) → activate a pending purchase, invoice the buyer,
  # and deliver the card. Idempotent. Signature matches Order/Booking#mark_paid!.
  def mark_paid!(processor: nil, reference: nil, amount: nil)
    return if active?
    update!(active: true)
    Invoice.generate_for(self) if purchaser_id.present?
    deliver!
  end

  def redeemable?
    active? && (expires_at.nil? || expires_at.future?) && current_balance > 0
  end

  # Add funds to the card. Used by staff (POS/cash, marked paid) and by the
  # online top-up webhook. Atomic; activates the card if it was inactive.
  def topup!(amount, method: nil)
    amount = amount.to_d
    raise "Top-up amount must be positive" unless amount.positive?

    with_lock do
      gift_card_transactions.create!(amount: amount, kind: "topup", method: method)
      update!(active: true, current_balance: current_balance + amount)
    end
  end

  def redeem!(amount, booking: nil)
    # with_lock takes a row lock (SELECT … FOR UPDATE) and reloads, so the
    # balance check and decrement are atomic — concurrent redeems can't overspend.
    with_lock do
      raise "Insufficient balance" if amount > current_balance
      gift_card_transactions.create!(amount: -amount, kind: "redeem", booking: booking)
      update!(current_balance: current_balance - amount)
    end
  end

  private

  def assign_code
    self.code ||= "BAYD-#{SecureRandom.uuid}"
  end

  def on_purchase
    Invoice.generate_for(self) if purchaser_id.present?
    deliver!
  end
end
