class EmployeeService < ApplicationRecord
  belongs_to :employee_profile
  belongs_to :service

  validates :employee_profile_id, uniqueness: { scope: :service_id }
  validates :price_override, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true

  def effective_price
    price_override || service.price
  end
end
