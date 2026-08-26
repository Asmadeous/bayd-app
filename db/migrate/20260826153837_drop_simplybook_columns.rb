class DropSimplybookColumns < ActiveRecord::Migration[8.1]
  def change
    # SimplyBook has been removed — availability + booking now run entirely on our
    # own AvailabilityEngine. Drop every column that only existed to sync with it.
    remove_column :bookings,          :simplybook_id,        :string
    remove_column :bookings,          :simplybook_batch_id,  :string
    remove_column :bookings,          :synced_at,            :datetime
    remove_column :employee_profiles, :simplybook_unit_id,   :string
    remove_column :services,          :simplybook_event_id,  :string
    remove_column :users,             :simplybook_client_id, :string
  end
end
