class AddSubscriptionClientTypeAndSpecialNeeds < ActiveRecord::Migration[8.1]
  def change
    # Recurring bookings keep the original client type (kids/elderly/group/adult)
    # so each generated appointment is priced on the right tier.
    add_column :subscriptions, :client_type, :string, default: "adult", null: false

    # Special-needs clients (like first-time clients) are offered a work-scope
    # video call before service; existing clients don't need one.
    add_column :users, :special_needs, :boolean, default: false, null: false
  end
end
