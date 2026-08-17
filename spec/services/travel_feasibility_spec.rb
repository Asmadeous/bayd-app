require "rails_helper"

RSpec.describe TravelFeasibility do
  let(:employee) { create(:employee_profile) }
  let(:service)  { create(:service, duration_minutes: 90) }
  let(:user)     { create(:user) }

  # Customer location for the slot we're testing (downtown-ish).
  let(:cust_lat) { 43.5402 }
  let(:cust_lng) { -79.6899 }

  def booking_at(starts, ends, lat:, lng:)
    Booking.create!(employee_profile: employee, service: service, user: user,
                    client_type: "adult", party_size: 1, status: "confirmed",
                    starts_at: starts, ends_at: ends, subtotal: 10, travel_fee: 0, total: 10,
                    service_latitude: lat, service_longitude: lng)
  end

  subject(:tf) { described_class.new(employee: employee, customer_lat: cust_lat, customer_lng: cust_lng) }

  it "is feasible when the tech has no adjacent jobs" do
    slot = Time.zone.parse("2026-08-20 12:00")
    expect(tf.feasible?(slot, slot + 90.minutes)).to be(true)
  end

  it "REJECTS a slot that starts the instant a far-away previous job ends (no travel time)" do
    slot = Time.zone.parse("2026-08-20 12:00")
    # Previous job ends exactly at 12:00, ~6.5 km away → needs ~15 min travel.
    booking_at(slot - 90.minutes, slot, lat: 43.5885, lng: -79.6439)
    expect(tf.feasible?(slot, slot + 90.minutes)).to be(false)
  end

  it "allows the slot when there IS enough gap after the previous job" do
    slot = Time.zone.parse("2026-08-20 12:00")
    # Previous job ends 30 min earlier → plenty of time for a 6.5 km hop.
    booking_at(slot - 120.minutes, slot - 30.minutes, lat: 43.5885, lng: -79.6439)
    expect(tf.feasible?(slot, slot + 90.minutes)).to be(true)
  end

  it "REJECTS when the tech can't reach the NEXT job in time after this slot" do
    slot = Time.zone.parse("2026-08-20 12:00")
    slot_end = slot + 90.minutes
    # Next job starts the instant this ends, far away → can't make it.
    booking_at(slot_end, slot_end + 60.minutes, lat: 43.5885, lng: -79.6439)
    expect(tf.feasible?(slot, slot_end)).to be(false)
  end

  it "does not judge feasibility when the customer's location is unknown" do
    tf = described_class.new(employee: employee, customer_lat: nil, customer_lng: nil)
    slot = Time.zone.parse("2026-08-20 12:00")
    booking_at(slot - 90.minutes, slot, lat: 43.5885, lng: -79.6439)
    expect(tf.feasible?(slot, slot + 90.minutes)).to be(true)
  end
end
