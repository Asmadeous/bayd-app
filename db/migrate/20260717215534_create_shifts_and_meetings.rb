class CreateShiftsAndMeetings < ActiveRecord::Migration[8.1]
  def change
    # Staff time-clock: each shift is one clock-in → clock-out session with the
    # GPS fix captured at each end. distance_km / fuel_reimbursement are computed
    # at clock-out for fuel compensation.
    create_table :shifts do |t|
      t.references :employee_profile, null: false, foreign_key: true
      t.string   :status,             null: false, default: "open" # open | closed
      t.datetime :clock_in_at,        null: false
      t.decimal  :clock_in_latitude,  precision: 10, scale: 6, null: false
      t.decimal  :clock_in_longitude, precision: 10, scale: 6, null: false
      t.datetime :clock_out_at
      t.decimal  :clock_out_latitude,  precision: 10, scale: 6
      t.decimal  :clock_out_longitude, precision: 10, scale: 6
      t.decimal  :distance_km,         precision: 10, scale: 3, default: "0.0", null: false
      t.decimal  :fuel_reimbursement,  precision: 10, scale: 2, default: "0.0", null: false
      t.decimal  :fuel_rate_per_km,    precision: 10, scale: 4
      t.text     :notes
      t.timestamps
    end
    add_index :shifts, %i[employee_profile_id clock_in_at]
    # At most one open shift per employee — prevents a double clock-in race.
    add_index :shifts, :employee_profile_id, unique: true,
              where: "status = 'open'", name: "index_shifts_one_open_per_employee"

    # Work-scope confirmation call between customer and staff (Jitsi Meet room).
    create_table :meetings do |t|
      t.references :booking,   null: false, foreign_key: true
      t.string   :room_name,   null: false
      t.string   :provider,    null: false, default: "jitsi"
      t.string   :status,      null: false, default: "scheduled" # scheduled | completed | cancelled
      t.datetime :scheduled_at
      t.datetime :started_at
      t.datetime :ended_at
      t.timestamps
    end
    add_index :meetings, :room_name, unique: true
    add_index :meetings, :booking_id, unique: true, name: "index_meetings_one_per_booking"
  end
end
