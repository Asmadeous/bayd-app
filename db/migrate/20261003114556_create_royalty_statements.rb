class CreateRoyaltyStatements < ActiveRecord::Migration[8.1]
  def change
    create_table :royalty_statements do |t|
      t.references :franchise, null: false, foreign_key: true
      t.date :period_start, null: false
      t.date :period_end, null: false
      t.decimal :gross, precision: 12, scale: 2, null: false, default: 0
      t.decimal :refunds, precision: 12, scale: 2, null: false, default: 0
      t.decimal :royalty_pct, precision: 5, scale: 2, null: false, default: 0
      t.decimal :royalty_due, precision: 12, scale: 2, null: false, default: 0
      t.string :currency, null: false
      t.string :status, null: false, default: "open"
      t.datetime :paid_at
      t.timestamps
    end
    add_index :royalty_statements, %i[franchise_id period_start], unique: true
  end
end
