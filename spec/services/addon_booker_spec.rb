require "rails_helper"

# AddonBooker adds extra services the SAME tech performs to a primary booking,
# back-to-back in one visit, linked via parent_booking_id, and (best-effort)
# pushed to SimplyBook as one is_sequential batch.
RSpec.describe AddonBooker, type: :service do
  before do
    # No live SimplyBook from specs.
    allow(SimplyBook::Client).to receive(:new)
      .and_return(instance_double(SimplyBook::Client, create_booking_result: { id: nil, batch_id: nil }))
  end

  let(:zone)    { BusinessHours.zone }
  let(:user)    { create(:user, first_name: "Ada") }
  let(:tech)    { create(:employee_profile) }
  let(:mani)    { create(:service, name: "Manicure", duration_minutes: 30, price: 40) }
  let(:pedi)    { create(:service, name: "Pedicure", duration_minutes: 60, price: 50) }
  let(:lashes)  { create(:service, name: "Lashes",   duration_minutes: 90, price: 120) }

  before { tech.services << mani << pedi } # tech performs mani + pedi, NOT lashes

  def primary
    start = zone.parse("#{Date.current + 3} 10:00")
    Booking.create!(user: user, service: mani, employee_profile: tech,
                    starts_at: start, ends_at: start + 30.minutes,
                    status: "confirmed", subtotal: 40, travel_fee: 0, total: 40)
  end

  it "books an add-on the tech performs, consecutively after the primary" do
    b = primary
    result = described_class.new(b, [ pedi.id ]).call

    expect(result.failures).to be_empty
    expect(result.addons.size).to eq(1)
    addon = result.addons.first
    expect(addon.service).to eq(pedi)
    expect(addon.parent_booking_id).to eq(b.id)
    expect(addon.starts_at).to eq(b.ends_at)                 # back-to-back
    expect(addon.ends_at).to eq(b.ends_at + 60.minutes)
    expect(addon.total).to eq(50)
    expect(addon.employee_profile).to eq(tech)              # same tech
  end

  it "chains multiple add-ons back-to-back and stacks the times" do
    b = primary
    pedi2 = create(:service, name: "Extra", duration_minutes: 15, price: 10)
    tech.services << pedi2
    result = described_class.new(b, [ pedi.id, pedi2.id ]).call

    expect(result.addons.map(&:service)).to eq([ pedi, pedi2 ])
    expect(result.addons[0].starts_at).to eq(b.ends_at)                  # 10:30
    expect(result.addons[1].starts_at).to eq(b.ends_at + 60.minutes)    # 11:30
  end

  it "skips an add-on the tech does NOT perform, without failing the visit" do
    b = primary
    result = described_class.new(b, [ lashes.id ]).call

    expect(result.addons).to be_empty
    expect(result.failures).to contain_exactly(
      hash_including(service_id: lashes.id, reason: a_string_matching(/not offered/i))
    )
  end

  it "ignores the primary service if passed as an add-on" do
    b = primary
    result = described_class.new(b, [ mani.id, pedi.id ]).call
    expect(result.addons.map(&:service)).to eq([ pedi ]) # mani (primary) dropped
  end
end
