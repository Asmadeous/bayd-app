class AddNoDoubleBookingConstraint < ActiveRecord::Migration[8.1]
  ACTIVE = "('pending','confirmed','in_progress')".freeze

  def up
    enable_extension "btree_gist" unless extension_enabled?("btree_gist")

    # Resolve any pre-existing overlaps so the constraint can be created: cancel
    # the later booking in each overlapping pair (keep the earliest).
    execute <<~SQL
      UPDATE bookings SET
        status = 'cancelled',
        cancellation_reason = COALESCE(cancellation_reason, 'Auto-resolved scheduling overlap')
      WHERE id IN (
        SELECT b2.id
        FROM bookings b1
        JOIN bookings b2
          ON b1.employee_profile_id = b2.employee_profile_id
         AND b1.id < b2.id
         AND b1.status IN #{ACTIVE}
         AND b2.status IN #{ACTIVE}
         AND tsrange(b1.starts_at, b1.ends_at) && tsrange(b2.starts_at, b2.ends_at)
      );
    SQL

    # Hard guard: a tech cannot have two overlapping active bookings.
    # Back-to-back (one ends exactly when the next starts) is allowed.
    execute <<~SQL
      ALTER TABLE bookings
        ADD CONSTRAINT no_double_booking
        EXCLUDE USING gist (
          employee_profile_id WITH =,
          tsrange(starts_at, ends_at) WITH &&
        )
        WHERE (status IN #{ACTIVE});
    SQL
  end

  def down
    execute "ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_double_booking;"
  end
end
