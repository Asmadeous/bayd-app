class AddServiceRadiusToEmployeeProfiles < ActiveRecord::Migration[8.1]
  def change
    # Coverage that works in any country: a radius around the tech's base, as an
    # alternative (or addition) to their postal-prefix list (service_fsas).
    add_column :employee_profiles, :service_radius_km, :decimal, precision: 6, scale: 2
  end
end
