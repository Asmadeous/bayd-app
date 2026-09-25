require "rails_helper"

# Calendar loading: `from`/`to` (company-zone dates, inclusive) return the whole
# range unpaginated, scoped to the caller.
RSpec.describe "Booking lists by date range", type: :request do
  let(:zone)     { BusinessHours.zone }
  let(:service)  { create(:service, duration_minutes: 60, price: 80) }
  let(:customer) { create(:user) }
  let(:other)    { create(:user) }
  let(:tech_user) { create(:user, email: "rangetech@baydspa.ca", role: :employee) }
  let!(:tech)    { create(:employee_profile, user: tech_user) }
  let(:other_tech) { create(:employee_profile) }
  let(:admin)    { create(:user, role: :admin) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def book(user:, at:, profile: tech, status: "confirmed")
    Booking.create!(user: user, employee_profile: profile, service: service, status: status,
                    starts_at: at, ends_at: at + 1.hour, subtotal: 80, travel_fee: 0, total: 80)
  end

  def ids = response.parsed_body["data"].map { |b| b["id"] }

  # 9:30 PM Toronto on Oct 14 is already Oct 15 in UTC: it must count as Oct 14.
  let(:evening) { zone.local(2026, 10, 14, 21, 30) }
  let!(:in_range)   { book(user: customer, at: evening) }
  let!(:cancelled)  { book(user: customer, at: zone.local(2026, 10, 10, 10), status: "cancelled") }
  let!(:after)      { book(user: customer, at: zone.local(2026, 10, 15, 9)) }
  let!(:someone_else) { book(user: other, at: zone.local(2026, 10, 12, 10), profile: other_tech) }

  let(:range) { { from: "2026-10-01", to: "2026-10-14" } }

  it "customer: own bookings in range, any status, oldest first, unpaginated" do
    get "/api/v1/bookings", params: range, headers: auth_header(customer)

    expect(response).to have_http_status(:ok)
    expect(ids).to eq([ cancelled.id, in_range.id ])
    expect(response.parsed_body).not_to have_key("pagination")
  end

  it "staff: own jobs in range, including past and cancelled" do
    get "/api/v1/employee/schedule", params: range, headers: auth_header(tech_user)
    expect(ids).to eq([ cancelled.id, in_range.id ])
  end

  it "admin: everyone's bookings, still filterable by tech" do
    get "/api/v1/admin/bookings", params: range, headers: auth_header(admin)
    expect(ids).to eq([ cancelled.id, someone_else.id, in_range.id ])

    get "/api/v1/admin/bookings", params: range.merge(employee_id: other_tech.id), headers: auth_header(admin)
    expect(ids).to eq([ someone_else.id ])
  end

  it "keeps the paginated list when no range is given" do
    get "/api/v1/bookings", headers: auth_header(customer)
    expect(response.parsed_body).to have_key("pagination")
  end

  {
    "to before from" => { from: "2026-10-14", to: "2026-10-01" },
    "a range over 62 days" => { from: "2026-01-01", to: "2026-06-01" },
    "a malformed date" => { from: "2026-10-01", to: "14/10/2026" }
  }.each do |label, params|
    it "rejects #{label}" do
      get "/api/v1/bookings", params: params, headers: auth_header(customer)
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
