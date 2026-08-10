class ProductCategory < ApplicationRecord
  belongs_to :parent, class_name: "ProductCategory", optional: true
  has_many :subcategories, class_name: "ProductCategory", foreign_key: :parent_id, dependent: :nullify, inverse_of: :parent
  has_many :products, dependent: :nullify

  validates :name, :slug, presence: true
  validates :slug, uniqueness: true

  scope :active, -> { where(active: true) }
  scope :roots,  -> { where(parent_id: nil) }
  default_scope { order(:position) }
end
