require "rails_helper"

# Work-scope calls are set for a time both people know, instead of one person
# being dropped into an empty room: pick a time (or "now"), move it, and both
# are told. The room opens 10 minutes before.
RSpec.describe "Work-scope call scheduling", type: :request do
  include ActiveSupport::Testing::TimeHelpers

  let(:customer)  { create(:user, email: "ana@example.com", first_name: "Ana") }
  let(:tech_user) { create(:user, email: "sue@baydspa.ca", first_name: "Sue", role: :employee) }
  let(:tech)      { create(:employee_profile, user: tech_user) }
  let(:service)   { create(:service, name: "Manicure", duration_minutes: 60, price: 40) }
  let(:starts_at) { BusinessHours.zone.local(2026, 10, 9, 14, 0) }
  let(:booking) do
    Booking.create!(user: customer, employee_profile: tech, service: service, status: "confirmed",
                    starts_at: starts_at, ends_at: starts_at + 1.hour, subtotal: 40, travel_fee: 0, total: 40)
  end

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  around { |example| travel_to(BusinessHours.zone.local(2026, 10, 5, 9, 0)) { example.run } }

  it "sets the call for the chosen business-time slot and tells both people" do
    expect {
      post "/api/v1/bookings/#{booking.id}/meeting", params: { scheduled_at: "2026-10-08T15:30" },
                                                      headers: auth_header(customer), as: :json
    }.to change(Notification, :count).by(2)

    body = response.parsed_body
    expect(Time.zone.parse(body["scheduled_at"])).to eq(BusinessHours.zone.local(2026, 10, 8, 15, 30))
    expect(Time.zone.parse(body["join_opens_at"])).to eq(BusinessHours.zone.local(2026, 10, 8, 15, 20))
    expect(tech_user.notifications.last.title).to eq("Video call set for Thu, Oct 8 at 3:30 PM")
  end

  it "starts straight away with now=true" do
    post "/api/v1/bookings/#{booking.id}/meeting", params: { now: true }, headers: auth_header(tech_user), as: :json

    expect(Time.zone.parse(response.parsed_body["scheduled_at"])).to be_within(1.minute).of(Time.current)
  end

  it "refuses a time in the past or after the appointment" do
    post "/api/v1/bookings/#{booking.id}/meeting", params: { scheduled_at: "2026-10-01T10:00" },
                                                    headers: auth_header(customer), as: :json
    expect(response).to have_http_status(:unprocessable_entity)

    post "/api/v1/bookings/#{booking.id}/meeting", params: { scheduled_at: "2026-10-10T10:00" },
                                                    headers: auth_header(customer), as: :json
    expect(response).to have_http_status(:unprocessable_entity)
  end

  it "moves the call, tells both people and books new reminders" do
    meeting = Meeting.create!(booking: booking, scheduled_at: BusinessHours.zone.local(2026, 10, 8, 15, 30))

    expect {
      patch "/api/v1/meetings/#{meeting.id}", params: { scheduled_at: "2026-10-09T11:00" },
                                               headers: auth_header(tech_user), as: :json
    }.to change(Notification, :count).by(2).and have_enqueued_job(MeetingReminderJob).twice

    expect(meeting.reload.scheduled_at).to eq(BusinessHours.zone.local(2026, 10, 9, 11, 0))
    expect(customer.notifications.last.title).to eq("Video call moved to Fri, Oct 9 at 11:00 AM")
  end

  it "only lets people on the booking move it" do
    meeting = Meeting.create!(booking: booking, scheduled_at: BusinessHours.zone.local(2026, 10, 8, 15, 30))
    stranger = create(:user, email: "x@example.com")

    patch "/api/v1/meetings/#{meeting.id}", params: { scheduled_at: "2026-10-09T11:00" }, headers: auth_header(stranger), as: :json

    expect(response).to have_http_status(:forbidden)
  end
end
