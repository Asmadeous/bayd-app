class AddRescheduleCountToBookings < ActiveRecord::Migration[8.1]
  def change
    add_column :bookings, :reschedule_count, :integer, default: 0, null: false
  end
end
