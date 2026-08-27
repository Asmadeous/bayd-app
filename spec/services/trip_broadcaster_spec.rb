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

  it "computes an ETA and broadcasts the position to the upcoming booking" do
    booking = booking_at(30.minutes.from_now, lat: 43.65, lng: -79.38)

    expect(TripChannel).to receive(:broadcast_position).with(
      booking, hash_including(latitude: 43.70, longitude: -79.42, eta_minutes: an_instance_of(Integer))
    )
    described_class.call(employee_profile: tech, latitude: 43.70, longitude: -79.42)
  end

  it "does nothing when the tech has no upcoming active booking" do
    booking_at(2.hours.ago, lat: 43.65, lng: -79.38) # already ended
    expect(TripChannel).not_to receive(:broadcast_position)
    described_class.call(employee_profile: tech, latitude: 43.70, longitude: -79.42)
  end

  describe ".eta_minutes" do
    it "estimates travel time from straight-line distance at avg speed" do
      # ~5km apart -> a few minutes at 35 km/h; positive integer.
      eta = described_class.eta_minutes(43.65, -79.38, 43.70, -79.42)
      expect(eta).to be_a(Integer)
      expect(eta).to be > 0
    end
  end
end
