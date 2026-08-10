class ProductVariant < ApplicationRecord
  belongs_to :product

  validates :label, presence: true
  validates :sku, uniqueness: true, allow_nil: true
  validates :stock_quantity, numericality: { greater_than_or_equal_to: 0 }
  validates :price, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true

  scope :active,   -> { where(active: true) }
  scope :in_stock, -> { where("stock_quantity > 0") }

  # Variants may override the parent price; nil means "same as the product".
  def effective_price
    price || product.price
  end
end
