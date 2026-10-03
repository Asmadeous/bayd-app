class AddVisitFieldsToSubscriptions < ActiveRecord::Migration[8.1]
  def change
    # Empty = a legacy single-service subscription (service_id alone).
    add_column :subscriptions, :service_ids, :integer, array: true, default: [], null: false
    add_column :subscriptions, :party_size, :integer, default: 1, null: false
  end
end
