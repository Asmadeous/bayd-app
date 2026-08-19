require "rails_helper"

# Bookings made in the SimplyBook app are mirrored locally by BookingMirror.
# Previously the mirrored booking did NOT copy the provider's partner_id, so a
# partner-provider's app bookings were never attributed to the partner (they'd
# never be paid out). This guards the fix: the mirror now stamps partner_id.
RSpec.describe SimplyBook::BookingMirror, "partner attribution", type: :service do
  before do
    allow(SimplyBook::Client).to receive(:new)
      .and_return(instance_double(SimplyBook::Client, create_provider: nil))
    # Mirror (don't reject) app-origin bookings.
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:fetch).with("SIMPLYBOOK_WEB_ONLY", "false").and_return("false")
  end

  let(:partner)  { create(:partner) }
  let(:provider) do
    p = partner.ensure_provider!
    p.update!(simplybook_unit_id: "unit-77")
    p
  end
  let(:service) { create(:service).tap { |s| s.update!(simplybook_event_id: "evt-9") } }

  def detail
    {
      "id" => "sb-booking-100",
      "event_id" => "evt-9",
      "unit_id" => "unit-77",
      "start_datetime" => 2.days.from_now.strftime("%Y-%m-%d %H:%M:%S"),
      "status" => "confirmed",
      "client" => { "email" => "shopper@example.com", "name" => "Ann Shopper" }
    }
  end

  it "stamps the mirrored booking with the provider's partner_id" do
    provider
    service

    expect { described_class.upsert(detail) }.to change(Booking, :count).by(1)

    booking = Booking.find_by(simplybook_id: "sb-booking-100")
    expect(booking).to be_present
    expect(booking.employee_profile_id).to eq(provider.id)
    expect(booking.partner_id).to eq(partner.id)
  end
end
