class CreateWebauthnCredentials < ActiveRecord::Migration[8.1]
  def change
    create_table :webauthn_credentials do |t|
      t.references :user, null: false, foreign_key: true
      # webauthn_id = the credential identifier (globally unique); public_key +
      # sign_count are what verify() needs. nickname lets a user name a device.
      t.string  :webauthn_id, null: false
      t.string  :public_key, null: false
      t.integer :sign_count, null: false, default: 0
      t.string  :nickname

      t.timestamps
    end

    add_index :webauthn_credentials, :webauthn_id, unique: true
  end
end
