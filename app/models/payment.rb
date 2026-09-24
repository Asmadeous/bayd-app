class Payment < ApplicationRecord
  belongs_to :payable, polymorphic: true

  enum :status, { pending: "pending", paid: "paid", refunded: "refunded", failed: "failed" }
  enum :method, { card: "card", gift_card: "gift_card", cash: "cash", interac: "interac", cheque: "cheque" }, prefix: true

  # Methods a tech collects in person and records by hand (no processor to verify).
  OFFLINE_METHODS = %w[cash interac cheque].freeze

  validates :amount, numericality: { greater_than: 0 }
end
