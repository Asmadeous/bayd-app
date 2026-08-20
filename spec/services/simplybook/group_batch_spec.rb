require "rails_helper"

# A group booking (party of N) is pushed to SimplyBook as N individual bookings
# grouped under ONE SimplyBook "multiple" batch (native Multiple Bookings), not
# a single count=N slot. The first booking creates the batch; the returned
# batch_id chains the rest. Guards AssignmentService#push_group_as_batch.
RSpec.describe "Group booking → SimplyBook batch", type: :service do
  let(:service) { create(:service, duration_minutes: 60).tap { |s| s.update!(simplybook_event_id: "evt1") } }
  let(:tech)    { create(:employee_profile).tap { |e| e.update!(simplybook_unit_id: "unit1") } }
  let(:user)    { create(:user, first_name: "Gina") }

  # Fake SB client: assigns a batch id on the first call, echoes it after.
  # Installed in a before block so a live API call can NEVER happen from this spec.
  let!(:sb) do
    calls = []
    fake = instance_double(SimplyBook::Client)
    allow(fake).to receive(:create_booking_result) do |**kw|
      calls << kw[:batch_id]
      { id: "sb-#{calls.size}", batch_id: kw[:batch_id] || 999 }
    end
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

  # push_group_as_batch only reads @booking_request.user (for the client name).
  def assignment_for(booking)
    svc = AssignmentService.allocate
    svc.instance_variable_set(:@booking_request, double(user: booking.user))
    svc
  end

  it "creates one SimplyBook booking per party member, all in one batch" do
    sb
    booking = group_booking(party: 3)

    assignment_for(booking).send(:push_group_as_batch, booking)

    expect(sb).to have_received(:create_booking_result).exactly(3).times
    booking.reload
    expect(booking.simplybook_id).to eq("sb-1")            # first booking id
    expect(booking.simplybook_batch_id).to eq("999")       # the shared batch
  end

  it "passes batch_id nil on the first call, then the batch id on the rest" do
    sb # install the stub before the push runs
    booking = group_booking(party: 2)

    assignment_for(booking).send(:push_group_as_batch, booking)

    expect(sb).to have_received(:create_booking_result).with(hash_including(batch_id: nil)).once
    expect(sb).to have_received(:create_booking_result).with(hash_including(batch_id: 999)).once
  end
end
