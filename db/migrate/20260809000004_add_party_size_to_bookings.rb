class AddPartySizeToBookings < ActiveRecord::Migration[8.1]
  def change
    # Number of people for a group booking (drives total = per-person price ×
    # party_size). 1 for non-group bookings.
    add_column :booking_requests, :party_size, :integer, default: 1, null: false
    add_column :bookings, :party_size, :integer, default: 1, null: false
  end
end
