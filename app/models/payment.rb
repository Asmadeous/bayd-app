class Payment < ApplicationRecord
  belongs_to :payable, polymorphic: true

  enum :status, { pending: "pending", paid: "paid", refunded: "refunded", failed: "failed" }
  enum :method, { card: "card", gift_card: "gift_card", cash: "cash", interac: "interac", cheque: "cheque" }, prefix: true

  # Methods a tech collects in person and records by hand (no processor to verify).
  OFFLINE_METHODS = %w[cash interac cheque].freeze

  validates :amount, numericality: { greater_than: 0 }

  # A booking's invoice is issued at completion, often before the tech charges.
  # When money lands afterwards, re-issue it as paid (or with the new balance).
  after_commit :refresh_booking_invoice, on: %i[create update], if: -> { paid? && saved_change_to_status? }

  private

  def refresh_booking_invoice
    return unless payable_type == "Booking"

    InvoiceRefreshJob.perform_later(payable_id)
  end
end
