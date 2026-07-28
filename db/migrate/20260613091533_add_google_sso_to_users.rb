class AddGoogleSsoToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :google_uid, :string
    add_index  :users, :google_uid, unique: true, where: "google_uid IS NOT NULL"

    # SSO users have no password — make nullable
    change_column_null :users, :password_digest, true
  end
end
