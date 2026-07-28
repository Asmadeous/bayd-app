class LoyaltyTransaction < ApplicationRecord
  belongs_to :loyalty_account
  belongs_to :booking, optional: true

  enum :kind, { earn: "earn", redeem: "redeem", adjust: "adjust" }

  validates :points, :kind, presence: true
end
