class CreateSubscriptions < ActiveRecord::Migration[8.1]
  def change
    create_table :subscriptions do |t|
      t.references :user,    null: false, foreign_key: true
      t.references :service, null: false, foreign_key: true
      t.references :address, foreign_key: true
      t.integer  :interval_weeks, null: false, default: 2
      t.string   :status,         null: false, default: "active" # active | paused | cancelled
      t.datetime :next_run_at,    null: false
      t.boolean  :auto_charge,    null: false, default: false
      t.decimal  :price, precision: 10, scale: 2
      t.datetime :started_at
      t.datetime :last_booking_at
      t.datetime :paused_at
      t.datetime :cancelled_at
      t.timestamps
    end
    add_index :subscriptions, %i[status next_run_at]

    add_reference :bookings, :subscription, foreign_key: true
  end
end
