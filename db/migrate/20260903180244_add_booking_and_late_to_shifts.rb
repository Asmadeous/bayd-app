class AddBookingAndLateToShifts < ActiveRecord::Migration[8.1]
  def change
    # A shift is now the clock-in/out for ONE booking (per-appointment time clock).
    # Nullable so any pre-existing day-level shift rows stay valid.
    add_reference :shifts, :booking, null: true, foreign_key: true
    # Stamped true when the tech clocked in after the scheduled start + grace.
    add_column :shifts, :arrived_late, :boolean, null: false, default: false
  end
end
