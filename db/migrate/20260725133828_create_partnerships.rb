class CreatePartnerships < ActiveRecord::Migration[8.1]
  def change
    # A partner business supplies technicians (and their FSA coverage) to the
    # B.A.Y.D pool. B.A.Y.D is merchant of record, holds funds, and settles the
    # partner's share on a cycle.
    create_table :partners do |t|
      t.string  :name,   null: false
      t.string  :slug,   null: false
      t.string  :email
      t.string  :phone
      t.string  :status, null: false, default: "active" # active | inactive
      t.decimal :platform_fee_pct, precision: 5, scale: 2, null: false, default: 20.0
      t.text    :payout_notes
      t.timestamps
    end
    add_index :partners, :slug, unique: true

    # A provider belongs to a partner, or null = in-house B.A.Y.D staff.
    add_reference :employee_profiles, :partner, foreign_key: true

    # A settled payout batch: the partner's share of completed bookings.
    create_table :partner_payouts do |t|
      t.references :partner, null: false, foreign_key: true
      t.integer  :booking_count,    null: false, default: 0
      t.decimal  :gross,            precision: 10, scale: 2, null: false, default: 0
      t.decimal  :fee_amount,       precision: 10, scale: 2, null: false, default: 0
      t.decimal  :amount,           precision: 10, scale: 2, null: false, default: 0
      t.decimal  :platform_fee_pct, precision: 5,  scale: 2, null: false, default: 0
      t.string   :status,           null: false, default: "pending" # pending | paid
      t.datetime :paid_at
      t.text     :notes
      t.timestamps
    end

    # Booking attribution (denormalized so payouts stay stable) + settlement link.
    add_reference :bookings, :partner,        foreign_key: true
    add_reference :bookings, :partner_payout, foreign_key: true
  end
end
