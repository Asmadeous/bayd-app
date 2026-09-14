require "rails_helper"

RSpec.describe MileageCalculator, type: :service do
  let(:tech)     { create(:employee_profile) }
  let(:customer) { create(:user) }
  let(:service)  { create(:service, duration_minutes: 60) }

  # Real ROAD distance per leg comes from Directions (Google). Stub it so the spec
  # is deterministic and never hits the network: every leg is 10 km of road.
  before { allow(Directions).to receive(:road_km).and_return(10.0) }

  def shift_with(clock_in:, clock_out:, in_coords:, out_coords:)
    Shift.create!(
      employee_profile: tech, status: "closed",
      clock_in_at: clock_in, clock_out_at: clock_out,
      clock_in_latitude: in_coords[0], clock_in_longitude: in_coords[1],
      clock_out_latitude: out_coords[0], clock_out_longitude: out_coords[1],
    )
  end

  def serviced_booking(at:, lat:, lng:)
    Booking.create!(user: customer, service: service, employee_profile: tech,
                    starts_at: at, ends_at: at + 60.minutes, status: "completed",
                    subtotal: 1, travel_fee: 0, total: 1,
                    service_latitude: lat, service_longitude: lng)
  end

  it "sums ROAD distance across clock-in -> jobs -> clock-out (not straight-line)" do
    start = 2.hours.ago
    shift = shift_with(clock_in: start, clock_out: start + 90.minutes,
                       in_coords: [ 43.65, -79.38 ], out_coords: [ 43.70, -79.42 ])
    serviced_booking(at: start + 30.minutes, lat: 43.66, lng: -79.39)

    # 3 route points (clock-in, 1 job, clock-out) -> 2 legs -> 2 * 10 km.
    expect(MileageCalculator.for(shift)).to eq(20.0)
    expect(Directions).to have_received(:road_km).twice
  end

  it "skips legs with unknown coordinates rather than guessing" do
    start = 2.hours.ago
    # No clock-out coords -> that endpoint is dropped, leaving clock-in -> job.
    shift = shift_with(clock_in: start, clock_out: start + 90.minutes,
                       in_coords: [ 43.65, -79.38 ], out_coords: [ nil, nil ])
    serviced_booking(at: start + 30.minutes, lat: 43.66, lng: -79.39)

    # Only 2 valid points -> 1 leg -> 10 km.
    expect(MileageCalculator.for(shift)).to eq(10.0)
  end
end
