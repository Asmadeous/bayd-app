class Payment < ApplicationRecord
  belongs_to :payable, polymorphic: true

  enum :status, { pending: "pending", paid: "paid", refunded: "refunded", failed: "failed" }
  enum :method, { card: "card", gift_card: "gift_card", cash: "cash" }, prefix: true

  validates :amount, numericality: { greater_than: 0 }
end
