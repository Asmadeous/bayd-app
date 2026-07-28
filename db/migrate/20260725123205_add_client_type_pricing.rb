class AddClientTypePricing < ActiveRecord::Migration[8.1]
  def change
    # Per-client-type price overrides for a service. Keys: "kids", "elderly",
    # "group" — "adult" always uses the base price column. Empty = use base.
    add_column :services, :tier_prices, :jsonb, default: {}, null: false

    # Who the booking is for: adult (default) | kids | elderly | group (5 people).
    add_column :booking_requests, :client_type, :string, default: "adult", null: false
    add_column :bookings,         :client_type, :string, default: "adult", null: false
  end
end
