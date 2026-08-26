require "rails_helper"

# Booking#reschedule! moves a booking to a new time, re-validating business
# hours, travel feasibility, and the no_double_booking DB constraint, then
# notifies. Guards the core.
RSpec.describe Booking, "#reschedule!", type: :model do
  let(:zone)    { BusinessHours.zone }
  let(:user)    { create(:user) }
  let(:service) { create(:service, duration_minutes: 60) }
  let(:tech)    { create(:employee_profile) }

  def booking_at(local_str, status: "confirmed")
    start = zone.parse(local_str)
    Booking.create!(user: user, service: service, employee_profile: tech,
                    starts_at: start, ends_at: start + 60.minutes,
                    status: status, subtotal: 50, travel_fee: 0, total: 50)
  end

  it "moves the booking to the new time and end" do
    b = booking_at("#{Date.current + 3} 10:00")
    new_start = zone.parse("#{Date.current + 4} 13:00")

    b.reschedule!(new_start: new_start)

    expect(b.reload.starts_at).to eq(new_start)
    expect(b.ends_at).to eq(new_start + 60.minutes)
  end

  it "increments reschedule_count only for customer reschedules" do
    b = booking_at("#{Date.current + 3} 10:00")
    b.reschedule!(new_start: zone.parse("#{Date.current + 4} 11:00"), by_customer: true)
    expect(b.reload.reschedule_count).to eq(1)
    b.reschedule!(new_start: zone.parse("#{Date.current + 5} 12:00"), by_customer: false)
    expect(b.reload.reschedule_count).to eq(1) # unchanged by admin
  end

  it "rejects a completed booking" do
    b = booking_at("#{Date.current + 3} 10:00", status: "completed")
    expect { b.reschedule!(new_start: zone.parse("#{Date.current + 4} 11:00")) }
      .to raise_error(Booking::RescheduleError) { |e| expect(e.reason).to eq(:not_reschedulable) }
  end

  it "rejects a time outside business hours" do
    b = booking_at("#{Date.current + 3} 10:00")
    expect { b.reschedule!(new_start: zone.parse("#{Date.current + 4} 22:00")) }
      .to raise_error(Booking::RescheduleError) { |e| expect(e.reason).to eq(:outside_hours) }
  end

  it "rejects a time that collides with the same tech's other booking (:slot_taken)" do
    booking_at("#{Date.current + 4} 13:00") # occupies the slot
    b = booking_at("#{Date.current + 3} 10:00")
    expect { b.reschedule!(new_start: zone.parse("#{Date.current + 4} 13:00")) }
      .to raise_error(Booking::RescheduleError) { |e| expect(e.reason).to eq(:slot_taken) }
  end

  it "notifies the customer on success" do
    b = booking_at("#{Date.current + 3} 10:00")
    expect {
      b.reschedule!(new_start: zone.parse("#{Date.current + 4} 11:00"))
    }.to change { Notification.where(user: user, kind: "booking_rescheduled").count }.by(1)
  end
end
