class CreateAvailabilitySchedules < ActiveRecord::Migration[8.1]
  def change
    create_table :availability_schedules do |t|
      t.references :employee_profile, null: false, foreign_key: true
      # Recurring weekly bookable-hours template. day_of_week 0=Sunday..6=Saturday.
      # start_time/end_time are time-of-day in the company zone (BusinessHours),
      # never UTC instants. Multiple rows per (tech, day) allowed -> split shifts.
      t.integer :day_of_week, null: false
      t.time    :start_time,  null: false
      t.time    :end_time,    null: false

      t.timestamps
    end

    add_index :availability_schedules, [ :employee_profile_id, :day_of_week ]
  end
end
