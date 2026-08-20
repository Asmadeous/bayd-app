class AddSimplybookBatchIdToBookings < ActiveRecord::Migration[8.1]
  def change
    add_column :bookings, :simplybook_batch_id, :string
    add_index :bookings, :simplybook_batch_id
  end
end
