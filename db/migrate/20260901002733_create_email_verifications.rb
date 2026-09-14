class CreateEmailVerifications < ActiveRecord::Migration[8.1]
  def change
    create_table :email_verifications do |t|
      t.string :email, null: false
      t.string :code_digest, null: false
      t.datetime :expires_at, null: false
      t.datetime :verified_at
      t.integer :attempts, default: 0, null: false

      t.timestamps
    end
    add_index :email_verifications, [ :email, :created_at ]
  end
end
