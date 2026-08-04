class AddOvertimeAmountToBookings < ActiveRecord::Migration[8.1]
  def change
    # Extra charged when a service runs over its allocated time (staff-entered).
    add_column :bookings, :overtime_amount, :decimal, precision: 10, scale: 2, null: false, default: 0
  end
end
