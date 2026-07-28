class Review < ApplicationRecord
  belongs_to :user
  belongs_to :booking, optional: true
  belongs_to :employee_profile, optional: true

  validates :rating, numericality: { only_integer: true, in: 1..5 }

  scope :approved, -> { where(approved: true) }
  scope :featured, -> { where(featured: true, approved: true) }
end
