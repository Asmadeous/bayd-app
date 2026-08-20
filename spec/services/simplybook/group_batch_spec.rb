require "rails_helper"

# A group booking of N is pushed to SimplyBook as ONE booking with count=N —
# SimplyBook's native group mechanism (AdminBookingBuildEntity.count). It is NOT
# split into N separate bookings (that sent duplicate provider/time bookings
# which SimplyBook rejects as double-bookings). Guards push_to_simplybook.
RSpec.describe "Group booking → SimplyBook count", type: :service do
  let(:service) { create(:service, duration_minutes: 60).tap { |s| s.update!(simplybook_event_id: "evt1") } }
  let(:tech)    { create(:employee_profile).tap { |e| e.update!(simplybook_unit_id: "unit1") } }
  let(:user)    { create(:user, first_name: "Gina") }

  let!(:sb) do
    fake = instance_double(SimplyBook::Client)
    allow(fake).to receive(:create_booking_result).and_return({ id: "sb-1", batch_id: nil })
    allow(fake).to receive(:register_client).and_return(nil)
    allow(SimplyBook::Client).to receive(:new).and_return(fake)
    fake
  end

  def group_booking(party:)
    start = BusinessHours.zone.parse("#{Date.current + 3} 10:00")
    Booking.create!(user: user, service: service, employee_profile: tech,
                    client_type: "group", party_size: party,
                    starts_at: start, ends_at: start + 60.minutes,
                    status: "confirmed", subtotal: 30, travel_fee: 0, total: 30)
  end

  def push(booking)
    svc = AssignmentService.allocate
    svc.instance_variable_set(:@booking_request, double(user: booking.user))
    svc.send(:push_to_simplybook, booking)
  end

  it "pushes ONE booking with count = party_size (not N separate bookings)" do
    booking = group_booking(party: 3)
    push(booking)

    expect(sb).to have_received(:create_booking_result).once
    expect(sb).to have_received(:create_booking_result).with(hash_including(count: 3))
    expect(booking.reload.simplybook_id).to eq("sb-1")
  end

  it "sends no count for a non-group (adult) booking" do
    start = BusinessHours.zone.parse("#{Date.current + 3} 10:00")
    booking = Booking.create!(user: user, service: service, employee_profile: tech,
                              client_type: "adult", party_size: 1,
                              starts_at: start, ends_at: start + 60.minutes,
                              status: "confirmed", subtotal: 30, travel_fee: 0, total: 30)
    push(booking)

    expect(sb).to have_received(:create_booking_result).with(hash_including(count: nil))
  end
end
