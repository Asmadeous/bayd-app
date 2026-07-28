class AddAddressToUsers < ActiveRecord::Migration[8.1]
  def change
    # Primary contact / service address on the user profile, captured at signup
    # and pre-filled into the booking form. Coverage is checked by postal_code.
    add_column :users, :street_address, :string
    add_column :users, :city,           :string
    add_column :users, :country,        :string, default: "Canada"
    add_column :users, :postal_code,    :string
  end
end
