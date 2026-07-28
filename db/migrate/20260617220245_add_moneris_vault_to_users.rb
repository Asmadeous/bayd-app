class AddMonerisVaultToUsers < ActiveRecord::Migration[8.1]
  def change
    # Moneris Vault data key for booking card-on-file + recurring auto-charge
    # (replaces the brief Helcim-for-bookings setup). card_brand / card_last4 reused.
    add_column :users, :moneris_data_key, :string
  end
end
