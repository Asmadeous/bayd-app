class AddShippingSpeedToProducts < ActiveRecord::Migration[8.1]
  def change
    # "fast" (2–7 business days) or "expedited". Displayed as a confidence badge
    # on the shop. Ships to USA & Canada only (a global note, not per-product).
    add_column :products, :shipping_speed, :string, default: "fast", null: false
  end
end
