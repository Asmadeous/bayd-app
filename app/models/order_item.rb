class OrderItem < ApplicationRecord
  belongs_to :order
  belongs_to :product

  validates :quantity, numericality: { only_integer: true, greater_than: 0 }
  validates :price, numericality: { greater_than_or_equal_to: 0 }
  validates :name, presence: true

  before_validation :snapshot_product, on: :create

  private

  def snapshot_product
    self.price ||= product&.price
    self.name  ||= product&.name
  end
end
