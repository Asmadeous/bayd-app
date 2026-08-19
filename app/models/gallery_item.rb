class GalleryItem < ApplicationRecord
  has_one_attached :image
  belongs_to :employee_profile, optional: true

  CATEGORIES = %w[Team Lashes Nails Pedicure Massage].freeze
  SIZES      = %w[standard wide tall].freeze

  validates :title,     presence: true
  validates :category,  inclusion: { in: CATEGORIES }
  validates :size,      inclusion: { in: SIZES }
  validate  :image_present

  scope :active,   -> { where(active: true) }
  scope :featured, -> { where(featured: true) }
  scope :ordered,  -> { order(:position, :created_at) }

  private

  # Either a real uploaded image or an external image_url — one is required.
  def image_present
    return if image_url.present? || image.attached?

    errors.add(:base, "An image is required")
  end
end
