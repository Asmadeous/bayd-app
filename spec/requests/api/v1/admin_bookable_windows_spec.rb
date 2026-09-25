require "rails_helper"

# The admin calendar's availability overlay: a tech's bookable hours per day,
# from the same EmployeeProfile#bookable_windows_for the booking engine uses.
RSpec.describe "GET /api/v1/admin/employees/:id/bookable_windows", type: :request do
  let(:admin) { create(:user, role: :admin) }
  let(:tech)  { create(:employee_profile) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  before do
    # 2026-10-05 is a Monday; 2026-10-06 a Tuesday.
    AvailabilitySchedule.create!(employee_profile: tech, day_of_week: 1, start_time: "09:00", end_time: "13:00")
    AvailabilitySchedule.create!(employee_profile: tech, day_of_week: 1, start_time: "14:00", end_time: "19:00")
    AvailabilitySchedule.create!(employee_profile: tech, day_of_week: 2, start_time: "09:00", end_time: "19:00")
    AvailabilityOverride.create!(employee_profile: tech, date: Date.new(2026, 10, 6), available: false)
  end

  it "returns each day's windows in company-zone HH:MM, with blackouts empty" do
    get "/api/v1/admin/employees/#{tech.id}/bookable_windows",
        params: { from: "2026-10-04", to: "2026-10-06" }, headers: auth_header(admin)

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["windows"]).to eq(
      "2026-10-04" => [],
      "2026-10-05" => [ { "start" => "09:00", "end" => "13:00" }, { "start" => "14:00", "end" => "19:00" } ],
      "2026-10-06" => []
    )
  end

  it "rejects a bad range and non-admins" do
    get "/api/v1/admin/employees/#{tech.id}/bookable_windows",
        params: { from: "2026-10-06", to: "2026-10-01" }, headers: auth_header(admin)
    expect(response).to have_http_status(:unprocessable_entity)

    get "/api/v1/admin/employees/#{tech.id}/bookable_windows",
        params: { from: "2026-10-01", to: "2026-10-02" }, headers: auth_header(create(:user))
    expect(response).to have_http_status(:forbidden)
  end
end
