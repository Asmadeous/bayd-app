class AddHelcimCardToUsers < ActiveRecord::Migration[8.1]
  def change
    # Helcim card-on-file token (replaces Square for bookings). card_brand /
    # card_last4 are reused for display.
    add_column :users, :helcim_card_token, :string
  end
end
