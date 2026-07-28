class FlexibleSubscriptionInterval < ActiveRecord::Migration[8.1]
  def up
    add_column :subscriptions, :interval_unit,  :string,  null: false, default: "week"
    add_column :subscriptions, :interval_count, :integer, null: false, default: 1

    execute "UPDATE subscriptions SET interval_unit = 'week', interval_count = GREATEST(COALESCE(interval_weeks, 1), 1)"

    remove_column :subscriptions, :interval_weeks
  end

  def down
    add_column :subscriptions, :interval_weeks, :integer, null: false, default: 2
    execute "UPDATE subscriptions SET interval_weeks = CASE interval_unit WHEN 'week' THEN interval_count ELSE 2 END"
    remove_column :subscriptions, :interval_unit
    remove_column :subscriptions, :interval_count
  end
end
