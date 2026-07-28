class GiftCardTransaction < ApplicationRecord
  belongs_to :gift_card
  belongs_to :booking, optional: true

  enum :kind, { issue: "issue", redeem: "redeem", refund: "refund" }

  validates :amount, :kind, presence: true
end
