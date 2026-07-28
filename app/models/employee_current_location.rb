class EmployeeCurrentLocation < ApplicationRecord
  belongs_to :employee_profile

  validates :latitude, :longitude, :recorded_at, presence: true
  validates :latitude,  numericality: { greater_than_or_equal_to: -90,  less_than_or_equal_to: 90 }
  validates :longitude, numericality: { greater_than_or_equal_to: -180, less_than_or_equal_to: 180 }
end
