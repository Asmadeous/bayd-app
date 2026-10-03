class ServiceCategory < ApplicationRecord
  include FranchiseScoped

  has_many :services, dependent: :restrict_with_error

  validates :name, :slug, presence: true
  validates :slug, uniqueness: { scope: :franchise_id }

  default_scope { order(:position) }
end
