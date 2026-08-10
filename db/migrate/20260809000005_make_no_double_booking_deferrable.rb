class MakeNoDoubleBookingDeferrable < ActiveRecord::Migration[8.1]
  # The no_double_booking exclusion constraint covers pending/confirmed/in_progress.
  # Flipping a held booking pending→confirmed keeps the same (employee, time-range)
  # in the constrained set, which self-conflicts on a non-deferrable exclusion
  # constraint. Making it DEFERRABLE lets us defer the check to commit (after the
  # old row version is gone) when confirming a held booking.
  def up
    execute "ALTER TABLE bookings DROP CONSTRAINT no_double_booking"
    execute <<~SQL.squish
      ALTER TABLE bookings ADD CONSTRAINT no_double_booking
      EXCLUDE USING gist (employee_profile_id WITH =, tsrange(starts_at, ends_at) WITH &&)
      WHERE (status IN ('pending','confirmed','in_progress'))
      DEFERRABLE INITIALLY IMMEDIATE
    SQL
  end

  def down
    execute "ALTER TABLE bookings DROP CONSTRAINT no_double_booking"
    execute <<~SQL.squish
      ALTER TABLE bookings ADD CONSTRAINT no_double_booking
      EXCLUDE USING gist (employee_profile_id WITH =, tsrange(starts_at, ends_at) WITH &&)
      WHERE (status IN ('pending','confirmed','in_progress'))
    SQL
  end
end
