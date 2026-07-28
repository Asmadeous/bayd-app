class ProductCategory < ApplicationRecord
  has_many :products, dependent: :nullify

  validates :name, :slug, presence: true
  validates :slug, uniqueness: true

  scope :active, -> { where(active: true) }
  default_scope { order(:position) }
end
