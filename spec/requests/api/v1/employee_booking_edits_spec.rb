require "rails_helper"

# A tech moves or cancels their OWN job from the staff app. Reschedule reuses
# Booking#reschedule! (hours, travel, double-booking) and never changes the tech;
# every refusal comes back in plain words with a next step.
RSpec.describe "Employee booking edits", type: :request do
  let(:tech_user)  { create(:user, first_name: "Claire", email: "tech@baydspa.ca", role: :employee) }
  let!(:profile)   { create(:employee_profile, user: tech_user) }
  let(:other_tech) { create(:employee_profile, user: create(:user, email: "other@baydspa.ca", role: :employee)) }
  let(:customer)   { create(:user, first_name: "Ada") }
  let(:service)    { create(:service, name: "Manicure", duration_minutes: 60, price: 80) }
  let(:day)        { Date.current + 3 }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def at(hour) = BusinessHours.zone.parse("#{day} #{hour}:00")

  def booking(employee: profile, hour: 10, status: "confirmed")
    Booking.create!(user: customer, service: service, employee_profile: employee,
                    starts_at: at(hour), ends_at: at(hour) + 1.hour, status: status,
                    subtotal: 80, travel_fee: 0, total: 80)
  end

  def reschedule(b, starts_at)
    post "/api/v1/employee/bookings/#{b.id}/reschedule", params: { starts_at: starts_at },
                                                          headers: auth_header(tech_user), as: :json
  end

  def cancel(b, reason)
    post "/api/v1/employee/bookings/#{b.id}/cancel", params: { reason: reason },
                                                      headers: auth_header(tech_user), as: :json
  end

  describe "reschedule" do
    it "moves the tech's own job and keeps it with them" do
      b = booking
      reschedule(b, "#{day}T14:00:00")

      expect(response).to have_http_status(:ok)
      b.reload
      expect(b.starts_at).to eq(at(14))
      expect(b.ends_at).to eq(at(15))
      expect(b.employee_profile).to eq(profile)
    end

    it "ignores an attempt to hand the job to another tech" do
      b = booking
      post "/api/v1/employee/bookings/#{b.id}/reschedule",
           params: { starts_at: "#{day}T14:00:00", employee_profile_id: other_tech.id },
           headers: auth_header(tech_user), as: :json

      expect(b.reload.employee_profile).to eq(profile)
    end

    it "404s for another tech's booking" do
      reschedule(booking(employee: other_tech), "#{day}T14:00:00")
      expect(response).to have_http_status(:not_found)
    end

    it "refuses a time that overlaps another of the tech's jobs with a 409 and a next step" do
      b = booking(hour: 10)
      booking(hour: 14)
      reschedule(b, "#{day}T14:30:00")

      expect(response).to have_http_status(:conflict)
      expect(response.parsed_body).to include("code" => "slot_taken",
                                              "error" => "You already have a job then. Pick another time, or move that job first.")
      expect(b.reload.starts_at).to eq(at(10))
    end

    it "refuses a time outside business hours" do
      reschedule(booking, "#{day}T22:00:00")
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to eq("That time is outside business hours. Pick a time the business is open.")
    end

    it "explains a travel-time refusal" do
      allow_any_instance_of(TravelFeasibility).to receive(:feasible?).and_return(false)
      reschedule(booking, "#{day}T14:00:00")
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to include("couldn't travel there in time")
    end

    it "refuses to move a completed job" do
      reschedule(booking(status: "completed"), "#{day}T14:00:00")
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to eq("This job is completed and can't be moved.")
    end

    it "refuses a time that has already passed" do
      b = booking
      reschedule(b, 1.hour.ago.in_time_zone(BusinessHours.zone).strftime("%Y-%m-%dT%H:%M:00"))
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to eq("That time has already passed. Pick a later time.")
      expect(b.reload.starts_at).to eq(at(10))
    end

    it "asks for a time when none is given" do
      reschedule(booking, "")
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to eq("Pick a new date and time.")
    end
  end

  describe "cancel" do
    let!(:admin) { create(:user, role: :admin) }

    it "cancels the tech's own job with the reason and tells the customer" do
      b = booking
      perform_enqueued_jobs { cancel(b, "Sick") }

      expect(response).to have_http_status(:ok)
      expect(b.reload).to be_cancelled
      expect(b.cancellation_reason).to eq("Sick")
      expect(Notification.exists?(user: customer, booking: b, kind: "booking_cancelled")).to be(true)
    end

    it "tells admins who cancelled, why, and what was paid" do
      b = booking
      b.payments.create!(amount: 80, status: "paid", method: "card", processor: "square", paid_at: Time.current)
      cancel(b, "Car broke down")

      note = Notification.find_by(user: admin, booking: b, kind: "booking_cancelled")
      expect(note.title).to eq("Claire cancelled a booking")
      expect(note.body).to include("Reason: Car broke down", "$80.00 was paid; refund it if due")
    end

    it "requires a reason" do
      b = booking
      cancel(b, " ")
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to eq("Choose a reason so the client and office know why.")
      expect(b.reload).to be_confirmed
    end

    it "refuses a job that is already under way" do
      cancel(booking(status: "in_progress"), "Sick")
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to eq("This job is in progress and can't be cancelled.")
    end

    it "404s for another tech's booking" do
      cancel(booking(employee: other_tech), "Sick")
      expect(response).to have_http_status(:not_found)
    end
  end
end
