require "rails_helper"

# Reviews are public once approved, so they must never carry the reviewer's
# contact details. Staff and admins get a name only too.
RSpec.describe "Review privacy", type: :request do
  let(:customer) do
    create(:user, email: "kim.lee@example.com", first_name: "Kim", last_name: "Lee", phone: "4165550100")
  end
  let(:tech_user) { create(:user, email: "sue@baydspa.ca", first_name: "Sue", role: :employee) }
  let(:tech) { create(:employee_profile, user: tech_user) }
  let(:service) { create(:service, name: "Gel Manicure", duration_minutes: 60, price: 50) }
  let(:booking) do
    Booking.create!(user: customer, employee_profile: tech, service: service, status: "completed",
                    starts_at: 2.days.ago, ends_at: 2.days.ago + 1.hour, subtotal: 50, travel_fee: 0, total: 50)
  end
  let!(:review) do
    Review.create!(user: customer, booking: booking, employee_profile: tech, rating: 5, body: "Loved it", approved: true, featured: true)
  end

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  it "shows the public a first name, last initial, technician and service only" do
    get "/api/v1/reviews"

    row = response.parsed_body["data"].first
    expect(row).to include("reviewer_name" => "Kim L.", "technician_name" => "Sue", "service_name" => "Gel Manicure", "body" => "Loved it")
    expect(response.body).not_to include("kim.lee@example.com", "4165550100")
  end

  it "gives the technician the client's name but no contact details" do
    get "/api/v1/employee/reviews", headers: auth_header(tech_user)

    expect(response.parsed_body["data"].first["user"]).to eq("id" => customer.id, "first_name" => "Kim", "last_name" => "Lee")
    expect(response.body).not_to include("kim.lee@example.com", "4165550100")
  end
end
