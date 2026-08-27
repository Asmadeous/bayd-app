class CreatePhoneVerifications < ActiveRecord::Migration[8.1]
  def change
    create_table :phone_verifications do |t|
      t.string   :phone, null: false
      # The OTP is stored hashed (SHA-256), never in plaintext.
      t.string   :code_digest, null: false
      t.datetime :expires_at, null: false
      t.integer  :attempts, null: false, default: 0
      t.datetime :verified_at

      t.timestamps
    end

    # Look up the newest live code for a phone.
    add_index :phone_verifications, [ :phone, :created_at ]
  end
end
