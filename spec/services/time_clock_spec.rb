require "rails_helper"

RSpec.describe TimeClock, type: :service do
  let(:tech)     { create(:employee_profile) }
  let(:customer) { create(:user) }
  let(:service)  { create(:service, duration_minutes: 60) }

  # Client location for the geofence.
  let(:client_lat) { 43.6500 }
  let(:client_lng) { -79.3800 }

  def booking(starts_at: 5.minutes.ago, status: "confirmed")
    Booking.create!(user: customer, service: service, employee_profile: tech,
                    starts_at: starts_at, ends_at: starts_at + 60.minutes, status: status,
                    subtotal: 10, travel_fee: 0, total: 10,
                    service_latitude: client_lat, service_longitude: client_lng)
  end

  describe ".clock_in window" do
    it "refuses clock-in more than #{Booking::ACCESS_LEAD_MIN} minutes before the start" do
      b = booking(starts_at: 2.hours.from_now)
      expect {
        described_class.clock_in(tech, booking: b, latitude: client_lat, longitude: client_lng)
      }.to raise_error(TimeClock::Error, /window hasn't started yet. You can clock in from .*30 minutes before/)
      expect(b.reload.status).to eq("confirmed")
    end

    it "allows clock-in inside the window" do
      b = booking(starts_at: 20.minutes.from_now)
      described_class.clock_in(tech, booking: b, latitude: client_lat, longitude: client_lng)
      expect(b.reload.status).to eq("in_progress")
    end
  end

  describe ".clock_in geofence" do
    it "blocks clock-in beyond 150 m of the client" do
      b = booking
      # ~2.7 km away.
      expect {
        described_class.clock_in(tech, booking: b, latitude: 43.67, longitude: -79.40)
      }.to raise_error(TimeClock::Error, /within 150 m/)
      expect(b.reload.status).to eq("confirmed") # unchanged
    end

    it "allows clock-in within 150 m and sets the booking in_progress" do
      b = booking
      shift = described_class.clock_in(tech, booking: b, latitude: 43.65005, longitude: -79.38005) # ~7 m
      expect(shift.booking_id).to eq(b.id)
      expect(shift).to be_status_open
      expect(b.reload.status).to eq("in_progress")
    end

    it "does not enforce the geofence when the booking has no location" do
      b = booking
      b.update!(service_latitude: nil, service_longitude: nil)
      expect {
        described_class.clock_in(tech, booking: b, latitude: 1.0, longitude: 1.0)
      }.not_to raise_error
    end
  end

  describe ".clock_in grace / late" do
    it "is on time when clocked in within the 15-min grace of the scheduled start" do
      b = booking(starts_at: 10.minutes.ago)
      shift = described_class.clock_in(tech, booking: b, latitude: client_lat, longitude: client_lng)
      expect(shift.arrived_late).to be(false)
    end

    it "is late when clocked in past the scheduled start + 15-min grace" do
      b = booking(starts_at: 20.minutes.ago)
      shift = described_class.clock_in(tech, booking: b, latitude: client_lat, longitude: client_lng)
      expect(shift.arrived_late).to be(true)
    end
  end

  describe ".clock_out" do
    it "closes the shift and completes the booking" do
      b = booking
      described_class.clock_in(tech, booking: b, latitude: client_lat, longitude: client_lng)
      shift = described_class.clock_out(tech, booking: b, latitude: client_lat, longitude: client_lng)
      expect(shift).to be_status_closed
      expect(b.reload.status).to eq("completed")
    end

    it "raises when clocking out without an open shift for that booking" do
      b = booking
      expect {
        described_class.clock_out(tech, booking: b, latitude: client_lat, longitude: client_lng)
      }.to raise_error(TimeClock::Error, /not clocked in/)
    end
  end

  describe "one open job at a time" do
    it "blocks clocking into a second booking while one is open" do
      a = booking
      other = booking(starts_at: 2.hours.from_now)
      described_class.clock_in(tech, booking: a, latitude: client_lat, longitude: client_lng)
      expect {
        described_class.clock_in(tech, booking: other, latitude: client_lat, longitude: client_lng)
      }.to raise_error(TimeClock::Error, /already clocked in/)
    end
  end
end
