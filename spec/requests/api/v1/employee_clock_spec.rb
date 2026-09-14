require "rails_helper"

# Per-booking time clock + the charge-gate: a tech clocks in AT the client
# (geofenced), and can only charge (overtime) once they've started the job.
RSpec.describe "Employee per-booking clock + charge gate", type: :request do
  let(:tech_user) { create(:user, email: "tech@baydspa.ca", role: :employee) }
  let!(:profile)  { create(:employee_profile, user: tech_user) }
  let(:customer)  { create(:user) }
  let(:service)   { create(:service, duration_minutes: 60, price: 80) }

  let(:client_lat) { 43.6500 }
  let(:client_lng) { -79.3800 }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def booking(status: "confirmed")
    Booking.create!(user: customer, service: service, employee_profile: profile,
                    starts_at: 5.minutes.ago, ends_at: 55.minutes.from_now, status: status,
                    subtotal: 80, travel_fee: 0, total: 80,
                    service_latitude: client_lat, service_longitude: client_lng)
  end

  describe "POST /employee/bookings/:id/clock_in" do
    it "clocks in within the geofence and moves the booking to in_progress" do
      b = booking
      post "/api/v1/employee/bookings/#{b.id}/clock_in",
           params: { latitude: 43.65005, longitude: -79.38005 },
           headers: auth_header(tech_user), as: :json
      expect(response).to have_http_status(:created)
      expect(b.reload.status).to eq("in_progress")
    end

    it "rejects clock-in outside 150 m with 422" do
      b = booking
      post "/api/v1/employee/bookings/#{b.id}/clock_in",
           params: { latitude: 43.67, longitude: -79.40 },
           headers: auth_header(tech_user), as: :json
      expect(response).to have_http_status(:unprocessable_content)
      expect(JSON.parse(response.body)["error"]).to match(/within 150 m/)
    end
  end

  describe "charge gate on POST /employee/bookings/:id/overtime" do
    it "refuses to charge a booking that hasn't been clocked into" do
      b = booking(status: "confirmed")
      post "/api/v1/employee/bookings/#{b.id}/overtime",
           params: { amount: 25 }, headers: auth_header(tech_user), as: :json
      expect(response).to have_http_status(:unprocessable_content)
      expect(JSON.parse(response.body)["error"]).to match(/Clock in/)
    end

    it "allows the charge once the booking is in progress" do
      b = booking(status: "in_progress")
      result = Struct.new(:mode, :url, :error) do
        def success? = true
      end.new(:link, "http://pay", nil)
      allow_any_instance_of(BookingPaymentService).to receive(:collect).and_return(result)

      post "/api/v1/employee/bookings/#{b.id}/overtime",
           params: { amount: 25 }, headers: auth_header(tech_user), as: :json
      expect(response).to have_http_status(:ok)
      expect(b.reload.overtime_amount.to_f).to eq(25.0)
    end
  end
end
