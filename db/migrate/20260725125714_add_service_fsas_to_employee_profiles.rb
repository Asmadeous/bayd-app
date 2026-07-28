class AddServiceFsasToEmployeeProfiles < ActiveRecord::Migration[8.1]
  def change
    # The Forward Sortation Areas (first 3 chars of a postal code, e.g. "L5N")
    # this provider serves. Company coverage is the union across all providers.
    add_column :employee_profiles, :service_fsas, :text, array: true, default: [], null: false
    add_index  :employee_profiles, :service_fsas, using: :gin
  end
end
