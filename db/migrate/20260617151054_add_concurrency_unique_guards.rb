class AddConcurrencyUniqueGuards < ActiveRecord::Migration[8.1]
  def up
    # One invoice per source record. De-dup any existing duplicates first
    # (keep the earliest), then enforce at the DB level.
    execute <<~SQL
      DELETE FROM invoices a USING invoices b
      WHERE a.id > b.id
        AND a.invoiceable_type = b.invoiceable_type
        AND a.invoiceable_id   = b.invoiceable_id
        AND a.invoiceable_id IS NOT NULL;
    SQL
    add_index :invoices, %i[invoiceable_type invoiceable_id], unique: true,
              where: "invoiceable_id IS NOT NULL", name: "index_invoices_on_source_unique"

    # At most one earn / redeem loyalty transaction per booking (blocks
    # double-award on a job retry / concurrent run).
    execute <<~SQL
      DELETE FROM loyalty_transactions a USING loyalty_transactions b
      WHERE a.id > b.id
        AND a.booking_id = b.booking_id
        AND a.kind = b.kind
        AND a.booking_id IS NOT NULL;
    SQL
    add_index :loyalty_transactions, %i[booking_id kind], unique: true,
              where: "booking_id IS NOT NULL", name: "index_loyalty_txns_on_booking_kind_unique"
  end

  def down
    remove_index :invoices, name: "index_invoices_on_source_unique"
    remove_index :loyalty_transactions, name: "index_loyalty_txns_on_booking_kind_unique"
  end
end
