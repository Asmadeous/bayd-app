require "rails_helper"

# The assigned tech can call the client: the customer's own phone, or the
# booked-for person's when someone booked on their behalf. Customers' own
# booking JSON doesn't carry it.
RSpec.describe "Client phone for staff", type: :request do
  let(:customer)  { create(:user, email: "ana@example.com", first_name: "Ana", phone: "4165550100") }
  let(:tech_user) { create(:user, email: "sue@baydspa.ca", first_name: "Sue", role: :employee) }
  let(:tech)      { create(:employee_profile, user: tech_user) }
  let(:service)   { create(:service, name: "Manicure", duration_minutes: 60, price: 40) }

  def booking(**attrs)
    Booking.create!(user: customer, employee_profile: tech, service: service, status: "confirmed",
                    starts_at: 2.days.from_now, ends_at: 2.days.from_now + 1.hour, subtotal: 40, travel_fee: 0, total: 40, **attrs)
  end

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  it "shows the tech the customer's phone on their schedule and job screen" do
    b = booking

    get "/api/v1/employee/schedule", headers: auth_header(tech_user)
    expect(response.parsed_body["data"].first["client_phone"]).to eq("4165550100")

    get "/api/v1/employee/bookings/#{b.id}", headers: auth_header(tech_user)
    expect(response.parsed_body["client_phone"]).to eq("4165550100")
  end

  it "uses the booked-for person's phone when someone booked on their behalf" do
    booking(booked_for_name: "Mom", booked_for_phone: "6475550199")

    get "/api/v1/employee/schedule", headers: auth_header(tech_user)
    expect(response.parsed_body["data"].first["client_phone"]).to eq("6475550199")
  end

  it "isn't added to the customer's own booking JSON" do
    booking

    get "/api/v1/bookings", headers: auth_header(customer)
    expect(response.parsed_body["data"].first).not_to have_key("client_phone")
  end
end
