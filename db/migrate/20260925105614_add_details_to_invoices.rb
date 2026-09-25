# A snapshot of everything the invoice shows beyond its line items (business and
# client contact, service address, appointment, technician, payments), captured
# when the invoice is issued so it never changes if the booking does later.
class AddDetailsToInvoices < ActiveRecord::Migration[8.1]
  def change
    add_column :invoices, :details, :jsonb, default: {}, null: false
  end
end
