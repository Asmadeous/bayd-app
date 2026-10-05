class ServiceCategory < ApplicationRecord
  has_many :services, dependent: :restrict_with_error

  validates :name, :slug, presence: true
  validates :slug, uniqueness: true

  default_scope { order(:position) }
end
