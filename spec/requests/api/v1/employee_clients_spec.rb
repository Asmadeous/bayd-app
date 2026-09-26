require "rails_helper"

# Client lookup behind the staff booking form: find a customer by name, email or
# phone so the form fills their details and saved address.
RSpec.describe "GET /api/v1/employee/clients", type: :request do
  let(:tech_user) { create(:user, email: "tech@baydspa.ca", role: :employee) }
  let!(:profile)  { create(:employee_profile, user: tech_user) }
  let!(:client) do
    create(:user, email: "joshie@example.com", first_name: "Joshie", last_name: "Kamau", phone: "+1 (647) 555-0199")
  end

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def lookup(q, user: tech_user)
    get "/api/v1/employee/clients", params: { q: q }, headers: auth_header(user)
    JSON.parse(response.body)
  end

  it "finds a customer by full name, email or phone digits" do
    expect(lookup("joshie kam").map { |c| c["id"] }).to eq([ client.id ])
    expect(lookup("JOSHIE@EXAMPLE").first["email"]).to eq("joshie@example.com")
    expect(lookup("5550199").first["id"]).to eq(client.id)
  end

  it "returns the client's default address for autofill" do
    client.addresses.create!(line1: "10 Old Rd", city: "Toronto", province: "ON", postal_code: "M5J 2X5",
                             latitude: 43.64, longitude: -79.38)
    client.addresses.create!(line1: "3501 Glen Erin Dr", city: "Mississauga", province: "ON", postal_code: "L5L 2E9",
                             latitude: 43.54, longitude: -79.70, default: true)

    expect(lookup("joshie").first["address"]).to include("line1" => "3501 Glen Erin Dr", "city" => "Mississauga")
  end

  it "needs 3+ characters and never returns staff accounts" do
    expect(lookup("jo")).to eq([])
    expect(lookup("tech@baydspa")).to eq([])
  end

  it "is staff only" do
    get "/api/v1/employee/clients", params: { q: "joshie" }, headers: auth_header(client)
    expect(response).to have_http_status(:forbidden)
  end
end
