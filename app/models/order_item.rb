class OrderItem < ApplicationRecord
  belongs_to :order
  belongs_to :product
  belongs_to :product_variant, optional: true

  validates :quantity, numericality: { only_integer: true, greater_than: 0 }
  validates :price, numericality: { greater_than_or_equal_to: 0 }
  validates :name, presence: true

  before_validation :snapshot_product, on: :create

  private

  # Snapshot price + name at purchase time. When a variant is chosen its price
  # override and label win, so the order records exactly what was bought
  # (e.g. "Adjustable Satin Sleep Bonnet — Style 14").
  def snapshot_product
    self.price ||= product_variant&.effective_price || product&.price
    self.name  ||= [ product&.name, product_variant&.label ].compact.join(" — ").presence
  end
end
