class AddWebauthnToUsers < ActiveRecord::Migration[8.1]
  def change
    # A stable, opaque per-user handle for WebAuthn (never the email, which can
    # change). Backfilled for existing users, then required.
    add_column :users, :webauthn_id, :string
    add_index  :users, :webauthn_id, unique: true

    reversible do |dir|
      dir.up do
        User.reset_column_information
        User.where(webauthn_id: nil).find_each do |u|
          u.update_columns(webauthn_id: SecureRandom.uuid)
        end
      end
    end
  end
end
