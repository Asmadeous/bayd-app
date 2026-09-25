require "rails_helper"

RSpec.describe TripChannel, type: :channel do
  let(:customer) { create(:user) }
  let(:tech)     { create(:employee_profile) }
  let(:service)  { create(:service, duration_minutes: 60) }

  def booking(status: "confirmed", user: customer, start: 20.minutes.from_now)
    Booking.create!(user: user, service: service, employee_profile: tech,
                    starts_at: start, ends_at: start + 60.minutes, status: status,
                    subtotal: 1, travel_fee: 0, total: 1,
                    service_latitude: 43.65, service_longitude: -79.38)
  end

  it "lets the booking's own customer watch it" do
    b = booking
    stub_connection current_user: customer
    subscribe(booking_id: b.id)
    expect(subscription).to be_confirmed
    expect(subscription).to have_stream_from("trip:booking:#{b.id}")
  end

  it "rejects a customer who does not own the booking" do
    b = booking
    stub_connection current_user: create(:user)
    subscribe(booking_id: b.id)
    expect(subscription).to be_rejected
  end

  it "rejects tracking more than #{Booking::ACCESS_LEAD_MIN} minutes before the start" do
    b = booking(start: 2.hours.from_now)
    stub_connection current_user: customer
    subscribe(booking_id: b.id)
    expect(subscription).to be_rejected
  end

  it "rejects watching a completed booking" do
    b = booking(status: "completed")
    stub_connection current_user: customer
    subscribe(booking_id: b.id)
    expect(subscription).to be_rejected
  end

  it "broadcasts a position to the booking stream" do
    b = booking
    expect {
      described_class.broadcast_position(b, latitude: 43.7, longitude: -79.4, eta_minutes: 8)
    }.to have_broadcasted_to("trip:booking:#{b.id}")
      .with(hash_including(type: "position", eta_minutes: 8))
  end
end
