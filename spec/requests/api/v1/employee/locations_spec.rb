require "rails_helper"

RSpec.describe "POST /api/v1/employee/location", type: :request do
  let(:tech_user) { create(:user, email: "tech@baydspa.ca", role: :employee) }
  let!(:profile)  { create(:employee_profile, user: tech_user) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  it "records a ping + current location and returns 204" do
    expect {
      post "/api/v1/employee/location",
           params: { latitude: 43.70, longitude: -79.42, accuracy_meters: 12 },
           headers: auth_header(tech_user), as: :json
    }.to change { profile.location_pings.count }.by(1)

    expect(response).to have_http_status(:no_content)
    loc = profile.reload.employee_current_location
    expect(loc.latitude.to_f).to eq(43.70)
  end

  it "triggers a trip broadcast (best-effort)" do
    expect(TripBroadcaster).to receive(:call).with(hash_including(employee_profile: profile))
    post "/api/v1/employee/location",
         params: { latitude: 43.70, longitude: -79.42 },
         headers: auth_header(tech_user), as: :json
  end

  it "broadcasts the position to the admin fleet stream" do
    expect(AdminFleetChannel).to receive(:broadcast_position).with(profile, hash_including(latitude: 43.70))
    post "/api/v1/employee/location",
         params: { latitude: 43.70, longitude: -79.42 },
         headers: auth_header(tech_user), as: :json
  end

  it "requires an employee" do
    customer = create(:user)
    post "/api/v1/employee/location", params: { latitude: 1, longitude: 1 }, headers: auth_header(customer), as: :json
    expect(response).to have_http_status(:forbidden)
  end
end
