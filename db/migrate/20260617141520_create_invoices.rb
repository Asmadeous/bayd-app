class CreateInvoices < ActiveRecord::Migration[8.1]
  def change
    create_table :invoices do |t|
      t.references :user, null: false, foreign_key: true
      t.references :invoiceable, polymorphic: true # null for manual admin invoices
      t.string  :invoice_number, null: false
      t.string  :status,         null: false, default: "issued"
      t.string  :kind,           null: false, default: "manual" # booking | order | gift_card | manual
      t.decimal :subtotal,  precision: 10, scale: 2, null: false, default: 0
      t.decimal :tax,       precision: 10, scale: 2, null: false, default: 0
      t.decimal :total,     precision: 10, scale: 2, null: false, default: 0
      t.decimal :tax_rate,  precision: 5,  scale: 4, null: false, default: 0
      t.string  :currency,  null: false, default: "CAD"
      t.string  :payment_method
      t.jsonb   :line_items, null: false, default: []
      t.text    :notes
      t.datetime :issued_at
      t.datetime :paid_at
      t.timestamps
    end
    add_index :invoices, :invoice_number, unique: true
    add_index :invoices, :status
    add_index :invoices, :kind
  end
end
