require "rails_helper"

# The customer booking path (AssignmentService) must RESERVE time for add-on
# services, not just the primary - otherwise the slot search under-reserves and
# the add-on work can overlap the tech's next job (double-book). Add-on duration
# is folded into total_duration_minutes, which drives ends_at + the free check.
RSpec.describe AssignmentService, "add-on duration reservation" do
  let(:category) { ServiceCategory.find_or_create_by!(slug: "nails") { |c| c.name = "Nails" } }
  let(:primary)  { create(:service, name: "Manicure", duration_minutes: 60, price: 40, service_category: category) }
  let(:addon)    { create(:service, name: "Pedicure", duration_minutes: 30, price: 50, service_category: category) }
  let(:user)     { create(:user) }

  def booking_request(service)
    address = user.addresses.create!(line1: "100 City Centre Dr", city: "Mississauga", province: "ON", postal_code: "L5B 2C9")
    create(:booking_request,
           user: user, service: service, kind: "scheduled", client_type: "adult",
           party_size: 1, address: address, requested_start: 1.day.from_now.change(hour: 12))
  end

  it "adds the add-on service duration to the reserved visit length" do
    svc = described_class.new(booking_request(primary), addon_service_ids: [ addon.id ])
    # 60 (Manicure) + 30 (Pedicure add-on) = 90 min reserved for the whole visit.
    expect(svc.send(:total_duration_minutes)).to eq(90)
  end

  it "reserves only the primary duration when there are no add-ons" do
    svc = described_class.new(booking_request(primary), addon_service_ids: [])
    expect(svc.send(:total_duration_minutes)).to eq(60)
  end

  it "ignores the primary service if it's passed as an add-on (no double-count)" do
    svc = described_class.new(booking_request(primary), addon_service_ids: [ primary.id ])
    expect(svc.send(:total_duration_minutes)).to eq(60)
  end

  it "requested_end reflects the full reserved window" do
    svc = described_class.new(booking_request(primary), addon_service_ids: [ addon.id ])
    start = svc.send(:requested_start)
    expect(svc.send(:requested_end)).to eq(start + 90.minutes)
  end
end
