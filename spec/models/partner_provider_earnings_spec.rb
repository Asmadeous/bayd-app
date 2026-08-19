require "rails_helper"

# A partner earns from bookings whose booking.partner_id matches. Because the
# partner-provider's EmployeeProfile carries partner_id, bookings created for it
# stamp booking.partner_id (assignment_service / employees_controller / the
# now-fixed booking_mirror), and those completed bookings roll up into the
# partner's pending earnings. This guards that end-to-end economic link.
RSpec.describe Partner, "provider earnings roll-up", type: :model do
  before do
    allow(SimplyBook::Client).to receive(:new)
      .and_return(instance_double(SimplyBook::Client, create_provider: nil))
  end

  let(:partner)  { create(:partner, platform_fee_pct: 20) }
  let(:provider) { partner.ensure_provider! }
  let(:service)  { create(:service, price: 100) }
  let(:customer) { create(:user) }

  def completed_booking(partner_id:)
    Booking.create!(
      user: customer, service: service, employee_profile: provider,
      partner_id: partner_id,
      starts_at: 1.day.from_now, ends_at: 1.day.from_now + 1.hour,
      status: "completed", subtotal: 100, travel_fee: 0, total: 100
    )
  end

  it "counts a completed partner-stamped booking in pending_earnings" do
    completed_booking(partner_id: partner.id)

    earnings = partner.pending_earnings
    expect(earnings[:booking_count]).to eq(1)
    expect(earnings[:gross]).to eq(100)
    expect(earnings[:fee]).to eq(20)   # 20% platform fee
    expect(earnings[:owed]).to eq(80)  # partner's share
  end

  it "ignores a booking that was NOT stamped with the partner_id" do
    completed_booking(partner_id: nil)
    expect(partner.pending_earnings[:booking_count]).to eq(0)
  end
end
