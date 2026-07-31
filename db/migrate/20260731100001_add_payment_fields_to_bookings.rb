class AddPaymentFieldsToBookings < ActiveRecord::Migration[8.1]
  def change
    change_table :bookings, bulk: true do |t|
      # WHEN the customer chose to pay. Group bookings take a deposit upfront.
      t.string  :payment_timing, null: false, default: "pay_after"   # pay_upfront | pay_after
      # Payment lifecycle, independent of timing.
      t.string  :payment_status, null: false, default: "unpaid"      # unpaid | deposit_paid | paid | refunded
      # Deposit collected upfront for group bookings (percentage of subtotal, resolved to $).
      t.decimal :deposit_amount, precision: 10, scale: 2, null: false, default: 0
      # Booking on behalf of someone else ("for a loved one") — payer ≠ recipient.
      t.string  :booked_for_name
      t.string  :booked_for_phone
    end
    add_index :bookings, :payment_status
  end
end
