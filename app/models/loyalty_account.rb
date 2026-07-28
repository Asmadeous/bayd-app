class LoyaltyAccount < ApplicationRecord
  belongs_to :user
  has_many :loyalty_transactions, dependent: :destroy

  validates :points_balance, numericality: { greater_than_or_equal_to: 0 }

  def earn!(points, booking: nil, description: nil)
    with_lock do
      loyalty_transactions.create!(points: points, kind: "earn", booking: booking, description: description)
      increment!(:points_balance, points)
    end
  end

  def redeem!(points, booking: nil, description: nil)
    # Lock + reload so the balance check and decrement can't race (no overspend).
    with_lock do
      raise "Insufficient points" if points > points_balance
      loyalty_transactions.create!(points: -points, kind: "redeem", booking: booking, description: description)
      decrement!(:points_balance, points)
    end
  end
end
