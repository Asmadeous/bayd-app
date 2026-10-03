class CreateVisits < ActiveRecord::Migration[8.1]
  def change
    create_table :visits do |t|
      t.references :user, null: false, foreign_key: true
      t.references :address, foreign_key: true
      t.string  :client_type, null: false, default: "adult"
      t.integer :party_size, null: false, default: 1
      t.string  :payment_timing, null: false, default: "pay_after"
      t.string  :booked_for_name
      t.string  :booked_for_phone
      t.text    :notes
      t.decimal :service_latitude, precision: 10, scale: 6
      t.decimal :service_longitude, precision: 10, scale: 6
      t.datetime :starts_at, null: false
      t.datetime :ends_at, null: false
      t.timestamps
    end
    add_index :visits, :starts_at

    add_reference :bookings, :visit, foreign_key: true
    add_column :bookings, :visit_position, :integer
  end
end
