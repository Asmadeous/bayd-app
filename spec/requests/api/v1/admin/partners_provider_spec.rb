require "rails_helper"

# Creating a Partner now also provisions it as a bookable provider: a
# partner-role User (external email allowed) + an EmployeeProfile linked back
# via partner_id. The partner logs in like staff and reaches the employee
# dashboard, but not admin. The provider is dormant until coverage/services are
# set. These guard the whole flow.
RSpec.describe "Admin partners → bookable provider", type: :request do
  let(:admin) { create(:user, email: "owner@baydspa.ca", role: :admin) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  before do
    # Never hit the real SimplyBook API from specs — stub the provider create.
    fake = instance_double(SimplyBook::Client, create_provider: "sb-unit-1")
    allow(SimplyBook::Client).to receive(:new).and_return(fake)
  end

  describe "POST /api/v1/admin/partners" do
    let(:params) do
      { partner: { name: "Glow Studio", email: "owner@glowstudio.com",
                   platform_fee_pct: 25, password: "partnerpass1" } }
    end

    it "creates the partner AND a partner-role provider with an external email" do
      expect {
        post "/api/v1/admin/partners", params: params, headers: auth_header(admin), as: :json
      }.to change(Partner, :count).by(1)
        .and change(EmployeeProfile, :count).by(1)

      expect(response).to have_http_status(:created)
      partner = Partner.find_by(name: "Glow Studio")
      provider = partner.provider
      expect(provider).to be_present
      expect(provider.partner_id).to eq(partner.id)
      expect(provider).to be_active
      expect(provider).to be_dispatchable
      expect(provider.user.role).to eq("partner")
      expect(provider.user.email).to eq("owner@glowstudio.com") # external domain accepted
    end

    it "lets the partner sign in via staff_login with the set password" do
      post "/api/v1/admin/partners", params: params, headers: auth_header(admin), as: :json

      post "/api/v1/auth/staff_login",
           params: { email: "owner@glowstudio.com", password: "partnerpass1" }, as: :json
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["token"]).to be_present
    end

    it "rejects a partner whose email collides with an existing user, with a clear message" do
      create(:user, email: "taken@glowstudio.com", role: :customer)
      post "/api/v1/admin/partners",
           params: { partner: { name: "Dup", email: "taken@glowstudio.com" } },
           headers: auth_header(admin), as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["error"]).to match(/already belongs/i)
      expect(Partner.find_by(name: "Dup")).to be_nil # rolled back — no orphan
    end
  end

  describe "partner access control" do
    let!(:provider) do
      post "/api/v1/admin/partners",
           params: { partner: { name: "Access Co", email: "boss@access.co", password: "pw12345678" } },
           headers: auth_header(admin), as: :json
      Partner.find_by(name: "Access Co").provider
    end

    it "reaches the employee dashboard (require_employee! allows partner)" do
      get "/api/v1/employee/schedule", headers: auth_header(provider.user)
      expect(response).to have_http_status(:ok)
    end

    it "is forbidden from admin endpoints (require_admin! excludes partner)" do
      get "/api/v1/admin/partners", headers: auth_header(provider.user)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "DELETE /api/v1/admin/partners/:id" do
    it "deactivates the provider but keeps its records" do
      post "/api/v1/admin/partners",
           params: { partner: { name: "Gone Co", email: "gone@ext.co", password: "pw12345678" } },
           headers: auth_header(admin), as: :json
      partner = Partner.find_by(name: "Gone Co")
      provider = partner.provider

      delete "/api/v1/admin/partners/#{partner.id}", headers: auth_header(admin)
      expect(response).to have_http_status(:no_content)

      provider.reload
      expect(provider).not_to be_active
      expect(provider).not_to be_dispatchable
      expect(Partner.find_by(id: partner.id)).to be_nil # partner org removed
      expect(provider.user).to be_present # login kept
    end
  end
end
