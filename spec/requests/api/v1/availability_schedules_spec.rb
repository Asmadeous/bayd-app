require "rails_helper"

# Staff self-serve bookable-hours endpoints. The load-bearing property: every
# action is scoped to the acting tech's OWN employee_profile — a tech can never
# read or mutate another tech's schedule/overrides.
RSpec.describe "Employee availability endpoints", type: :request do
  let(:tech_user)  { create(:user, email: "tech-a@baydspa.ca", role: :employee) }
  let!(:profile)   { create(:employee_profile, user: tech_user) }
  let(:other_user) { create(:user, email: "tech-b@baydspa.ca", role: :employee) }
  let!(:other)     { create(:employee_profile, user: other_user) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  describe "availability_schedules" do
    it "lists only the acting tech's schedules" do
      create(:availability_schedule, employee_profile: profile, day_of_week: 1)
      create(:availability_schedule, employee_profile: other, day_of_week: 2)

      get "/api/v1/employee/availability_schedules", headers: auth_header(tech_user)
      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body.size).to eq(1)
      expect(body.first["employee_profile_id"]).to eq(profile.id)
    end

    it "creates a schedule on the acting tech's own profile" do
      expect {
        post "/api/v1/employee/availability_schedules",
             params: { availability_schedule: { day_of_week: 3, start_time: "10:00", end_time: "16:00" } },
             headers: auth_header(tech_user), as: :json
      }.to change { profile.availability_schedules.count }.by(1)
      expect(response).to have_http_status(:created)
    end

    it "returns 422 on an invalid schedule" do
      post "/api/v1/employee/availability_schedules",
           params: { availability_schedule: { day_of_week: 9, start_time: "10:00", end_time: "16:00" } },
           headers: auth_header(tech_user), as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "cannot update another tech's schedule (404, not a cross-tenant write)" do
      foreign = create(:availability_schedule, employee_profile: other, day_of_week: 2)
      patch "/api/v1/employee/availability_schedules/#{foreign.id}",
            params: { availability_schedule: { start_time: "08:00" } },
            headers: auth_header(tech_user), as: :json
      expect(response).to have_http_status(:not_found)
      expect(foreign.reload.start_time.strftime("%H:%M")).not_to eq("08:00")
    end

    it "cannot destroy another tech's schedule" do
      foreign = create(:availability_schedule, employee_profile: other)
      delete "/api/v1/employee/availability_schedules/#{foreign.id}", headers: auth_header(tech_user)
      expect(response).to have_http_status(:not_found)
      expect(AvailabilitySchedule.exists?(foreign.id)).to be(true)
    end

    it "requires auth" do
      get "/api/v1/employee/availability_schedules"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "availability_overrides" do
    it "creates a blackout override" do
      expect {
        post "/api/v1/employee/availability_overrides",
             params: { availability_override: { date: (Date.current + 5).to_s, available: false } },
             headers: auth_header(tech_user), as: :json
      }.to change { profile.availability_overrides.count }.by(1)
      expect(response).to have_http_status(:created)
    end

    it "cannot destroy another tech's override" do
      foreign = create(:availability_override, employee_profile: other)
      delete "/api/v1/employee/availability_overrides/#{foreign.id}", headers: auth_header(tech_user)
      expect(response).to have_http_status(:not_found)
      expect(AvailabilityOverride.exists?(foreign.id)).to be(true)
    end
  end
end
