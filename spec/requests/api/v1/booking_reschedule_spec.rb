require "rails_helper"

RSpec.describe "Booking reschedule endpoints", type: :request do
  before do
    allow(SimplyBook::Client).to receive(:new)
      .and_return(instance_double(SimplyBook::Client, update_booking: true, cancel_booking: true))
  end

  let(:zone)    { BusinessHours.zone }
  let(:user)    { create(:user, email: "cust@example.com") }
  let(:admin)   { create(:user, email: "owner@baydspa.ca", role: :admin) }
  let(:service) { create(:service, duration_minutes: 60) }
  let(:tech)    { create(:employee_profile) }

  def token(u)
    JWT.encode({ sub: u.id, role: u.role, exp: 30.days.from_now.to_i },
               ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
  end
  def auth(u) = { "Authorization" => "Bearer #{token(u)}" }

  def booking(start_local, owner: user)
    start = zone.parse(start_local)
    Booking.create!(user: owner, service: service, employee_profile: tech,
                    starts_at: start, ends_at: start + 60.minutes,
                    status: "confirmed", subtotal: 50, travel_fee: 0, total: 50)
  end

  describe "POST /api/v1/bookings/:id/reschedule (customer)" do
    it "reschedules a booking more than 24h out" do
      b = booking("#{Date.current + 3} 10:00")
      post "/api/v1/bookings/#{b.id}/reschedule",
           params: { starts_at: "#{Date.current + 4}T13:00:00" }, headers: auth(user), as: :json

      expect(response).to have_http_status(:ok)
      expect(b.reload.starts_at).to eq(zone.parse("#{Date.current + 4} 13:00"))
      expect(b.reschedule_count).to eq(1)
    end

    it "rejects a reschedule within the 24h cutoff" do
      b = booking("#{(Time.current + 2.hours).in_time_zone(zone).strftime('%Y-%m-%d %H:%M')}")
      post "/api/v1/bookings/#{b.id}/reschedule",
           params: { starts_at: "#{Date.current + 5}T13:00:00" }, headers: auth(user), as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["error"]).to match(/24 hours/)
    end

    it "rejects once the reschedule cap (2) is reached" do
      b = booking("#{Date.current + 3} 10:00")
      b.update_columns(reschedule_count: 2)
      post "/api/v1/bookings/#{b.id}/reschedule",
           params: { starts_at: "#{Date.current + 4}T13:00:00" }, headers: auth(user), as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["error"]).to match(/limit/i)
    end

    it "can't reschedule another customer's booking (404)" do
      other = create(:user, email: "other@example.com")
      b = booking("#{Date.current + 3} 10:00", owner: other)
      post "/api/v1/bookings/#{b.id}/reschedule",
           params: { starts_at: "#{Date.current + 4}T13:00:00" }, headers: auth(user), as: :json

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/admin/bookings/:id/reschedule (admin)" do
    it "reschedules with NO cutoff and does not increment the customer counter" do
      b = booking("#{(Time.current + 2.hours).in_time_zone(zone).strftime('%Y-%m-%d %H:%M')}")
      post "/api/v1/admin/bookings/#{b.id}/reschedule",
           params: { starts_at: "#{Date.current + 4}T14:00:00" }, headers: auth(admin), as: :json

      expect(response).to have_http_status(:ok)
      expect(b.reload.starts_at).to eq(zone.parse("#{Date.current + 4} 14:00"))
      expect(b.reschedule_count).to eq(0) # admin doesn't consume the customer cap
    end

    it "moves the booking to a different technician when employee_profile_id is given" do
      b = booking("#{Date.current + 3} 10:00")
      other_tech = create(:employee_profile)
      post "/api/v1/admin/bookings/#{b.id}/reschedule",
           params: { starts_at: "#{Date.current + 4}T14:00:00", employee_profile_id: other_tech.id },
           headers: auth(admin), as: :json

      expect(response).to have_http_status(:ok)
      expect(b.reload.employee_profile_id).to eq(other_tech.id)
    end
  end
end
