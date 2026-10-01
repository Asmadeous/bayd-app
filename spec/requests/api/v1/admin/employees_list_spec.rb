require "rails_helper"

# The admin Employees page needs each tech's login, coverage and dispatch state
# (the full view); customers only ever get the safe public fields.
RSpec.describe "GET /api/v1/admin/employees", type: :request do
  let(:admin) { create(:user, email: "admin@baydspa.ca", role: :admin) }
  let!(:tech) do
    create(:employee_profile, user: create(:user, email: "sue@baydspa.ca", first_name: "Sue", role: :employee),
                              dispatchable: false, service_fsas: [ "L5N" ])
  end

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  it "includes the login, coverage and dispatch state" do
    get "/api/v1/admin/employees", headers: auth_header(admin)

    row = response.parsed_body["data"].find { |e| e["id"] == tech.id }
    expect(row).to include("dispatchable" => false, "service_fsas" => [ "L5N" ])
    expect(row["user"]).to include("email" => "sue@baydspa.ca", "first_name" => "Sue")
  end
end
