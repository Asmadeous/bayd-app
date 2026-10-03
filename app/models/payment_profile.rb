# A customer's card on file with one franchise's Square account: Square's
# customer and card ids plus what we show (brand, last 4). Card numbers never
# reach us.
class PaymentProfile < ApplicationRecord
  attribute :gateway, :string, default: "square"

  belongs_to :user
  belongs_to :franchise

  validates :gateway, inclusion: { in: Franchise::GATEWAYS }

  def card_on_file? = card_ref.present?
end
