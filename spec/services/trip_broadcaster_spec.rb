require "rails_helper"

RSpec.describe TripBroadcaster, type: :service do
  let(:tech)     { create(:employee_profile) }
  let(:customer) { create(:user) }
  let(:service)  { create(:service, duration_minutes: 60) }

  def booking_at(start, lat:, lng:, status: "confirmed")
    Booking.create!(user: customer, service: service, employee_profile: tech,
                    starts_at: start, ends_at: start + 60.minutes, status: status,
                    subtotal: 1, travel_fee: 0, total: 1,
                    service_latitude: lat, service_longitude: lng)
  end

  it "computes an ETA (via Directions) and broadcasts the position to the upcoming booking" do
    booking = booking_at(30.minutes.from_now, lat: 43.65, lng: -79.38)
    # Directions is stubbed so the spec never hits Google.
    allow(Directions).to receive(:eta_minutes).and_return(12)

    expect(TripChannel).to receive(:broadcast_position).with(
      booking, hash_including(latitude: 43.70, longitude: -79.42, eta_minutes: 12)
    )
    described_class.call(employee_profile: tech, latitude: 43.70, longitude: -79.42)
    # Origin is the tech's live GPS; destination is the booking's geocoded address.
    expect(Directions).to have_received(:eta_minutes).with(43.70, -79.42, booking.service_latitude, booking.service_longitude)
  end

  it "does nothing when the tech has no upcoming active booking" do
    booking_at(2.hours.ago, lat: 43.65, lng: -79.38) # already ended
    expect(TripChannel).not_to receive(:broadcast_position)
    described_class.call(employee_profile: tech, latitude: 43.70, longitude: -79.42)
  end
end
