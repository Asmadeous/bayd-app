require "rails_helper"

RSpec.describe "POST /api/v1/admin/employees — email domain restriction", type: :request do
  let(:admin) { create(:user, email: "owner@baydspa.ca", role: :admin) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  it "creates a staff account with a @baydspa.ca email" do
    post "/api/v1/admin/employees",
         params: { employee: { email: "newtech@baydspa.ca", first_name: "New", last_name: "Tech" } },
         headers: auth_header(admin), as: :json

    expect(response).to have_http_status(:created)
    expect(User.find_by(email: "newtech@baydspa.ca")).to be_present
  end

  it "rejects a staff account on any other domain, with no orphaned profile" do
    post "/api/v1/admin/employees",
         params: { employee: { email: "newtech@gmail.com", first_name: "New", last_name: "Tech" } },
         headers: auth_header(admin), as: :json

    expect(response).to have_http_status(:unprocessable_entity)
    json = JSON.parse(response.body)
    expect(json["errors"].join).to match(/@baydspa\.ca/)
    expect(User.find_by(email: "newtech@gmail.com")).to be_nil
    expect(EmployeeProfile.count).to eq(0)
  end
end
