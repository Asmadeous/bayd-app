class AddApartmentAccessToAddresses < ActiveRecord::Migration[8.1]
  def change
    add_column :addresses, :is_apartment, :boolean, default: false, null: false
    add_column :addresses, :buzz_code, :string
  end
end
