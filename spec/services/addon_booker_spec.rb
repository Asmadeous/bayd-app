require "rails_helper"

# AddonBooker resolves extra services the SAME tech performs, requested for a
# visit. Add-ons are NOTE-ONLY: no second Booking is created and nothing is
# pushed to SimplyBook as its own appointment — they're recorded on the primary
# booking's raw["addons"] and surfaced to the tech (calendar comment + admin
# email). Their price is folded into the one combined charge by the controller.
RSpec.describe AddonBooker, type: :service do
  let(:zone)      { BusinessHours.zone }
  let(:user)      { create(:user, first_name: "Ada") }
  let(:tech)      { create(:employee_profile) }
  let(:nails_cat) { ServiceCategory.find_or_create_by!(slug: "nails")  { |c| c.name = "Nails" } }
  let(:lash_cat)  { ServiceCategory.find_or_create_by!(slug: "lashes") { |c| c.name = "Lashes" } }
  let(:mani)      { create(:service, name: "Manicure", duration_minutes: 30, price: 40, service_category: nails_cat) }
  let(:pedi)      { create(:service, name: "Pedicure", duration_minutes: 60, price: 50, service_category: nails_cat) }
  let(:lashes)    { create(:service, name: "Lashes",   duration_minutes: 90, price: 120, service_category: lash_cat) }

  before { tech.services << mani << pedi } # tech performs mani + pedi, NOT lashes

  def primary
    start = zone.parse("#{Date.current + 3} 10:00")
    Booking.create!(user: user, service: mani, employee_profile: tech,
                    starts_at: start, ends_at: start + 30.minutes,
                    status: "confirmed", subtotal: 40, travel_fee: 0, total: 40)
  end

  it "records an add-on the tech performs as a note (no second booking)" do
    b = primary
    expect { described_class.new(b, [ pedi.id ]).call }.not_to change(Booking, :count)

    result = described_class.new(b, [ pedi.id ]).call
    expect(result.failures).to be_empty
    expect(result.addons).to contain_exactly(
      hash_including(id: pedi.id, name: "Pedicure", price: 50, duration: 60)
    )
    expect(result.total).to eq(50)
  end

  it "stamps the add-ons onto the primary booking's raw for the calendar/records" do
    b = primary
    described_class.new(b, [ pedi.id ]).call
    expect(b.reload.raw["addons"]).to contain_exactly(
      hash_including("id" => pedi.id, "name" => "Pedicure", "price" => "50.0", "duration" => 60)
    )
  end

  it "folds add-on prices into the primary's subtotal + total (so the charge is right)" do
    b = primary # Manicure $40
    described_class.new(b, [ pedi.id ]).call # + Pedicure $50
    b.reload
    expect(b.total).to eq(90)
    expect(b.subtotal).to eq(90)
    expect(b.outstanding_balance).to eq(90) # nothing paid yet
  end

  it "does not double-count the total when the same booking is re-resolved" do
    b = primary # $40
    described_class.new(b, [ pedi.id ]).call # + $50 -> $90
    described_class.new(b.reload, [ pedi.id ]).call # re-run: still $90, not $140
    b.reload
    expect(b.total).to eq(90)
    expect(b.raw["addons"].size).to eq(1)
  end

  it "resolves multiple add-ons and sums the total" do
    b = primary
    extra = create(:service, name: "Extra", duration_minutes: 15, price: 10, service_category: nails_cat)
    tech.services << extra
    result = described_class.new(b, [ pedi.id, extra.id ]).call

    expect(result.addons.map { |a| a[:name] }).to contain_exactly("Pedicure", "Extra")
    expect(result.total).to eq(60)
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
    expect(result.addons.map { |a| a[:id] }).to eq([ pedi.id ]) # mani (primary) dropped
  end

  it "reports an add-on service that doesn't exist" do
    b = primary
    result = described_class.new(b, [ 999_999 ]).call
    expect(result.addons).to be_empty
    expect(result.failures).to contain_exactly(hash_including(service_id: 999_999, reason: "unavailable"))
  end

  it "does not touch the primary's raw when there are no valid add-ons" do
    b = primary
    described_class.new(b, [ lashes.id ]).call
    expect(b.reload.raw["addons"]).to be_nil
  end

  # Lashes is siloed: a lash add-on can never combine with a non-lash primary
  # (and vice-versa) — there's no tech who does both, so SimplyBook would have no
  # provider. Rejected on category even if the tech is (wrongly) marked as doing it.
  it "rejects a lash add-on on a non-lash (nails) primary, even if the tech performs it" do
    tech.services << lashes # tech wrongly also performs lashes
    b = primary             # primary is a Manicure (nails)
    result = described_class.new(b, [ lashes.id ]).call

    expect(result.addons).to be_empty
    expect(result.failures).to contain_exactly(
      hash_including(service_id: lashes.id, reason: a_string_matching(/can't be combined/i))
    )
  end

  it "rejects a nails add-on on a lash primary" do
    tech.services << lashes
    start   = zone.parse("#{Date.current + 3} 10:00")
    lash_b  = Booking.create!(user: user, service: lashes, employee_profile: tech,
                              starts_at: start, ends_at: start + 90.minutes,
                              status: "confirmed", subtotal: 120, travel_fee: 0, total: 120)
    result = described_class.new(lash_b, [ pedi.id ]).call

    expect(result.addons).to be_empty
    expect(result.failures).to contain_exactly(
      hash_including(service_id: pedi.id, reason: a_string_matching(/can't be combined/i))
    )
  end

  it "allows a lash add-on on a lash primary (same category mixes)" do
    tech.services << lashes
    refill = create(:service, name: "Lash refill", duration_minutes: 60, price: 100, service_category: lash_cat)
    tech.services << refill
    start   = zone.parse("#{Date.current + 3} 10:00")
    lash_b  = Booking.create!(user: user, service: lashes, employee_profile: tech,
                              starts_at: start, ends_at: start + 90.minutes,
                              status: "confirmed", subtotal: 120, travel_fee: 0, total: 120)
    result = described_class.new(lash_b, [ refill.id ]).call

    expect(result.failures).to be_empty
    expect(result.addons.map { |a| a[:id] }).to eq([ refill.id ])
  end
end
