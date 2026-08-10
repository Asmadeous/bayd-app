class Product < ApplicationRecord
  belongs_to :product_category, optional: true
  has_many :order_items, dependent: :restrict_with_error
  has_many :product_variants, -> { order(:position) }, dependent: :destroy

  validates :name, presence: true
  validates :price, numericality: { greater_than_or_equal_to: 0 }
  validates :stock_quantity, numericality: { greater_than_or_equal_to: 0 }
  validates :sku, uniqueness: true, allow_nil: true

  scope :active,   -> { where(active: true) }
  scope :in_stock, -> { where("stock_quantity > 0") }

  # A product carries colours/shades when it has any active variant. The customer
  # must pick one; the variant's swatch image and (optional) price override apply.
  def has_variants?
    if product_variants.loaded?
      product_variants.any?(&:active)
    else
      product_variants.active.exists?
    end
  end
end
