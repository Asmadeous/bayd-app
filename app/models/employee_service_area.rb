class EmployeeServiceArea < ApplicationRecord
  belongs_to :employee_profile
  belongs_to :service_area

  validates :employee_profile_id, uniqueness: { scope: :service_area_id }
end
