class LocationPing < ApplicationRecord
  belongs_to :employee_profile

  validates :latitude, :longitude, :recorded_at, presence: true
end
