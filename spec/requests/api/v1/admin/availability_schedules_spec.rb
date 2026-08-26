require "rails_helper"

# Admin managing any technician's bookable-hours. Admin can CRUD any tech's rows;
# a non-admin (even a staff member) is forbidden from the admin namespace.
RSpec.describe "Admin availability endpoints", type: :request do
  let(:admin)     { create(:user, email: "admin@baydspa.ca", role: :admin) }
  let(:tech_user) { create(:user, email: "tech@baydspa.ca", role: :employee) }
  let!(:profile)  { create(:employee_profile, user: tech_user) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  describe "schedules" do
    it "admin creates a schedule on any tech" do
      expect {
        post "/api/v1/admin/employees/#{profile.id}/availability_schedules",
             params: { availability_schedule: { day_of_week: 2, start_time: "09:00", end_time: "15:00" } },
             headers: auth_header(admin), as: :json
      }.to change { profile.availability_schedules.count }.by(1)
      expect(response).to have_http_status(:created)
    end

    it "admin lists a tech's schedules" do
      create(:availability_schedule, employee_profile: profile, day_of_week: 4)
      get "/api/v1/admin/employees/#{profile.id}/availability_schedules", headers: auth_header(admin)
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.size).to eq(1)
    end

    it "admin deletes a tech's schedule" do
      sched = create(:availability_schedule, employee_profile: profile)
      delete "/api/v1/admin/employees/#{profile.id}/availability_schedules/#{sched.id}", headers: auth_header(admin)
      expect(response).to have_http_status(:no_content)
      expect(AvailabilitySchedule.exists?(sched.id)).to be(false)
    end

    it "forbids a non-admin (staff) from the admin namespace" do
      post "/api/v1/admin/employees/#{profile.id}/availability_schedules",
           params: { availability_schedule: { day_of_week: 2, start_time: "09:00", end_time: "15:00" } },
           headers: auth_header(tech_user), as: :json
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "overrides" do
    it "admin creates a blackout on any tech" do
      expect {
        post "/api/v1/admin/employees/#{profile.id}/availability_overrides",
             params: { availability_override: { date: (Date.current + 10).to_s, available: false } },
             headers: auth_header(admin), as: :json
      }.to change { profile.availability_overrides.count }.by(1)
      expect(response).to have_http_status(:created)
    end

    it "forbids a non-admin" do
      get "/api/v1/admin/employees/#{profile.id}/availability_overrides", headers: auth_header(tech_user)
      expect(response).to have_http_status(:forbidden)
    end
  end
end
