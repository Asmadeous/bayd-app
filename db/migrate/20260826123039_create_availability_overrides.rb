class CreateAvailabilityOverrides < ActiveRecord::Migration[8.1]
  def change
    create_table :availability_overrides do |t|
      t.references :employee_profile, null: false, foreign_key: true
      # A date-specific override that WINS over the weekly template for that date.
      # available=false -> full blackout (vacation/sick), times null.
      # available=true  -> extra/replacement hours that day; times may be set for a
      # partial-day window. Times are time-of-day in the company zone, not UTC.
      t.date    :date,       null: false
      t.boolean :available,  null: false, default: true
      t.time    :start_time
      t.time    :end_time

      t.timestamps
    end

    # One override row per tech per day.
    add_index :availability_overrides, [ :employee_profile_id, :date ], unique: true
  end
end
