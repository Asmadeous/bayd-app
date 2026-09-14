class DropTraccarDeviceIdFromEmployeeProfiles < ActiveRecord::Migration[8.1]
  def up
    remove_column :employee_profiles, :traccar_device_id
  end

  def down
    add_column :employee_profiles, :traccar_device_id, :string
    add_index :employee_profiles, :traccar_device_id, unique: true,
              where: "traccar_device_id IS NOT NULL"
  end
end
