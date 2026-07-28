class Product < ApplicationRecord
  belongs_to :product_category, optional: true
  has_many :order_items, dependent: :restrict_with_error

  validates :name, presence: true
  validates :price, numericality: { greater_than_or_equal_to: 0 }
  validates :stock_quantity, numericality: { greater_than_or_equal_to: 0 }
  validates :sku, uniqueness: true, allow_nil: true

  scope :active,   -> { where(active: true) }
  scope :in_stock, -> { where("stock_quantity > 0") }
end
