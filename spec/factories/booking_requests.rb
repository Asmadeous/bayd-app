FactoryBot.define do
  factory :booking_request do
    user
    service
    kind { "on_demand" }
    # on_demand requires customer lat/lng
    customer_latitude  { 43.6532 }
    customer_longitude { -79.3832 }
  end
end
