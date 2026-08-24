require "rails_helper"

# Add-ons are note-only: AssignmentService resolves them (via AddonBooker) before
# the SimplyBook push, stamps them on the booking, and lists them in the
# SimplyBook booking comment so the tech sees the extra work on the calendar.
# No second booking is created; the add-on services are NOT pushed as their own
# SimplyBook appointment.
RSpec.describe AssignmentService, "#call with add-ons", type: :service do
  let(:zone)   { BusinessHours.zone }
  let(:user)   { create(:user, first_name: "Ada") }
  let(:tech)   { create(:employee_profile) }
  let(:mani)   { create(:service, name: "Manicure", duration_minutes: 30, price: 40, simplybook_event_id: "evt-m") }
  let(:pedi)   { create(:service, name: "Pedicure", duration_minutes: 60, price: 50, simplybook_event_id: "evt-p") }

  before do
    tech.update!(simplybook_unit_id: "unit-1")
    tech.services << mani << pedi
  end

  # A minimal, already-created booking with an address, plus a stubbed
  # @booking_request so #booking_comment can build the address line. We drive the
  # note + comment path directly (the eligibility/geo gates are covered elsewhere).
  def service_with_booking(addon_ids)
    start   = zone.parse("#{Date.current + 3} 10:00")
    booking = Booking.create!(user: user, service: mani, employee_profile: tech,
                              starts_at: start, ends_at: start + 30.minutes,
                              status: "confirmed", subtotal: 40, travel_fee: 0, total: 40)
    svc = described_class.allocate # bypass initialize; set only what the push path reads
    svc.instance_variable_set(:@booking_request, double(user: user, address: nil))
    svc.instance_variable_set(:@addon_service_ids, addon_ids)
    [ svc, booking ]
  end

  it "lists the add-ons in the SimplyBook booking comment (note-only)" do
    svc, booking = service_with_booking([ pedi.id ])
    AddonBooker.new(booking, [ pedi.id ]).call # stamp raw["addons"]

    comment = svc.send(:booking_comment, booking)
    expect(comment).to include("Add-ons: Pedicure (+$50")
  end

  it "does not create a second booking for the add-on" do
    _svc, booking = service_with_booking([ pedi.id ])
    expect { AddonBooker.new(booking, [ pedi.id ]).call }.not_to change(Booking, :count)
  end

  it "leaves the comment add-on-free when there are none" do
    svc, booking = service_with_booking([])
    comment = svc.send(:booking_comment, booking)
    expect(comment).not_to include("Add-ons:")
  end
end
