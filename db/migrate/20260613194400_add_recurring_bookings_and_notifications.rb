class AddRecurringBookingsAndNotifications < ActiveRecord::Migration[8.1]
  def change
    # ── Square card-on-file + referral identity on users ──────────────────────
    change_table :users, bulk: true do |t|
      t.string :square_customer_id
      t.string :square_card_id
      t.string :card_brand
      t.string :card_last4
      t.string :referral_code
      t.references :referred_by, foreign_key: { to_table: :users }
    end
    add_index :users, :square_customer_id, unique: true, where: "square_customer_id IS NOT NULL"
    add_index :users, :referral_code,      unique: true, where: "referral_code IS NOT NULL"

    # ── Recurrence opt-in carried on the request, copied onto the booking ─────
    add_column :booking_requests, :recurrence_interval_weeks, :integer
    add_column :booking_requests, :recurrence_active, :boolean, null: false, default: false
    add_column :booking_requests, :auto_charge,       :boolean, null: false, default: false

    add_column :bookings, :recurrence_interval_weeks, :integer
    add_column :bookings, :recurrence_active, :boolean, null: false, default: false
    add_column :bookings, :auto_charge,       :boolean, null: false, default: false
    add_reference :bookings, :parent_booking, foreign_key: { to_table: :bookings }

    # ── Customer notifications (review request / rebook nudge / referral …) ────
    create_table :notifications do |t|
      t.references :user, null: false, foreign_key: true
      t.references :booking, foreign_key: true
      t.string   :kind,  null: false
      t.string   :title, null: false
      t.text     :body
      t.string   :action_url
      t.datetime :read_at
      t.jsonb    :metadata, null: false, default: {}
      t.timestamps
    end
    add_index :notifications, [ :user_id, :created_at ]
  end
end
