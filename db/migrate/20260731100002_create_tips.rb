class CreateTips < ActiveRecord::Migration[8.1]
  def change
    create_table :tips do |t|
      t.references :booking, null: false, foreign_key: true
      # Which technician the tip is for (tips are per-tech, not per-partner).
      t.references :employee_profile, null: false, foreign_key: true
      t.decimal :amount, precision: 10, scale: 2, null: false, default: 0
      t.string  :method, null: false, default: "card"       # card | cash
      t.string  :status, null: false, default: "collected"  # collected | paid_out
      t.datetime :paid_out_at
      # Links the card tip to the Square payment that collected it (idempotency/audit).
      t.string :processor_ref
      t.timestamps
    end
    add_index :tips, %i[employee_profile_id status]
  end
end
