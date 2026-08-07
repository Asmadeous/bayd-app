class GalleryItem < ApplicationRecord
  belongs_to :employee_profile, optional: true

  CATEGORIES = %w[Team Lashes Nails Pedicure Massage].freeze
  SIZES      = %w[standard wide tall].freeze

  validates :title,     presence: true
  validates :image_url, presence: true
  validates :category,  inclusion: { in: CATEGORIES }
  validates :size,      inclusion: { in: SIZES }

  scope :active,   -> { where(active: true) }
  scope :featured, -> { where(featured: true) }
  scope :ordered,  -> { order(:position, :created_at) }
end
