require "rails_helper"

RSpec.describe "GET /api/v1/admin/service_areas/coverage", type: :request do
  let(:admin) { create(:user, email: "owner@baydspa.ca", role: :admin) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  it "groups techs by the FSAs they actually serve (service_fsas — the real coverage source)" do
    susi = create(:employee_profile, service_fsas: %w[L5L L5M], active: true,
                   user: create(:user, email: "susi@baydspa.ca", role: :employee, first_name: "Susi"))
    claire = create(:employee_profile, service_fsas: %w[L5L], active: true,
                     user: create(:user, email: "claire@baydspa.ca", role: :employee, first_name: "Claire"))

    get "/api/v1/admin/service_areas/coverage", headers: auth_header(admin)

    expect(response).to have_http_status(:ok)
    json = JSON.parse(response.body)
    expect(json["configured"]).to be true
    expect(json["fsas"]["L5L"].map { |c| c["employee_profile_id"] }).to contain_exactly(susi.id, claire.id)
    expect(json["fsas"]["L5M"].map { |c| c["employee_profile_id"] }).to contain_exactly(susi.id)
  end

  it "excludes an inactive tech's coverage" do
    create(:employee_profile, service_fsas: %w[M5V], active: false,
           user: create(:user, email: "inactive@baydspa.ca", role: :employee))

    get "/api/v1/admin/service_areas/coverage", headers: auth_header(admin)

    json = JSON.parse(response.body)
    expect(json["fsas"]).not_to have_key("M5V")
  end

  it "reports configured:false when no tech has any FSAs set" do
    create(:employee_profile, service_fsas: [], active: true,
           user: create(:user, email: "noareas@baydspa.ca", role: :employee))

    get "/api/v1/admin/service_areas/coverage", headers: auth_header(admin)

    json = JSON.parse(response.body)
    expect(json["configured"]).to be false
    expect(json["fsas"]).to eq({})
  end

  it "requires admin auth" do
    get "/api/v1/admin/service_areas/coverage"
    expect(response).to have_http_status(:unauthorized)
  end
end
