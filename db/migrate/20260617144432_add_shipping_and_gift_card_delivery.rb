class AddShippingAndGiftCardDelivery < ActiveRecord::Migration[8.1]
  def change
    change_table :orders, bulk: true do |t|
      t.string   :tracking_number
      t.string   :carrier
      t.datetime :shipped_at
    end

    change_table :gift_cards, bulk: true do |t|
      t.string   :recipient_name
      t.text     :message
      t.string   :sender_name
      t.datetime :delivered_at
    end
  end
end
