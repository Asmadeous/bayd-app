require "rails_helper"

# A GROUP is one technician serving the whole party in a single, longer visit —
# NOT N independent clients booked in parallel. So it is pushed to SimplyBook as
# ONE ordinary booking (no native `count`), on a qty=1 provider, spanning the
# party-extended duration. Sending `count` would reserve N concurrent capacity
# seats (needs provider qty >= N) and leave the tech's slot bookable by others,
# overbooking a person who is actually occupied with the party. The party size is
# carried on the client name tag + comment so it shows on the calendar.
# Guards push_to_simplybook.
RSpec.describe "Group booking → SimplyBook (one long booking, no count)", type: :service do
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
    # A group's slot spans duration × party_size (the tech does the whole party).
    Booking.create!(user: user, service: service, employee_profile: tech,
                    client_type: "group", party_size: party,
                    starts_at: start, ends_at: start + (60 * party).minutes,
                    status: "confirmed", subtotal: 30 * party, travel_fee: 0, total: 30 * party)
  end

  def push(booking)
    svc = AssignmentService.allocate
    svc.instance_variable_set(:@booking_request, double(user: booking.user))
    svc.send(:push_to_simplybook, booking)
  end

  it "pushes ONE ordinary booking with NO native count for a group" do
    booking = group_booking(party: 3)
    push(booking)

    expect(sb).to have_received(:create_booking_result).once
    expect(sb).to have_received(:create_booking_result).with(hash_excluding(:count))
    expect(booking.reload.simplybook_id).to eq("sb-1")
  end

  it "records the party size in the booking comment so it shows on the calendar" do
    push(group_booking(party: 4))

    expect(sb).to have_received(:create_booking_result).with(
      hash_including(comment: a_string_including("party of 4"))
    )
  end

  it "sends no count for a non-group (adult) booking either" do
    start = BusinessHours.zone.parse("#{Date.current + 3} 10:00")
    booking = Booking.create!(user: user, service: service, employee_profile: tech,
                              client_type: "adult", party_size: 1,
                              starts_at: start, ends_at: start + 60.minutes,
                              status: "confirmed", subtotal: 30, travel_fee: 0, total: 30)
    push(booking)

    expect(sb).to have_received(:create_booking_result).with(hash_excluding(:count))
  end
end
