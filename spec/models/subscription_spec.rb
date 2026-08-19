require "rails_helper"

# Auto-renewal: when a customer opts into recurrence on the booking page, the
# booking-request controller calls Subscription.start_from with the interval
# unit/count + auto_charge it read from the request. This guards that core.
RSpec.describe Subscription, type: :model do
  let(:user)    { create(:user) }
  let(:service) { create(:service, price: 80) }

  def booking(starts_at:)
    Booking.create!(
      user: user, service: service,
      employee_profile: create(:employee_profile),
      starts_at: starts_at, ends_at: starts_at + 1.hour,
      status: "confirmed", subtotal: 80, travel_fee: 0, total: 80
    )
  end

  describe ".start_from" do
    it "creates an active subscription seeded from the booking, weekly cadence" do
      start = 2.days.from_now.change(usec: 0)
      bkg = booking(starts_at: start)

      sub = described_class.start_from(bkg, interval_unit: "week", interval_count: 1, auto_charge: true)

      expect(sub).to be_persisted
      expect(sub.status).to eq("active")
      expect(sub.user).to eq(user)
      expect(sub.service).to eq(service)
      expect(sub.interval_unit).to eq("week")
      expect(sub.interval_count).to eq(1)
      expect(sub.auto_charge).to be(true)
      expect(sub.price).to eq(80)
      # Next run is one interval after the first booking.
      expect(sub.next_run_at).to eq(start + 1.week)
      # The first booking is linked back to the subscription.
      expect(bkg.reload.subscription).to eq(sub)
    end

    it "supports a multi-month cadence without auto-charge" do
      start = 1.day.from_now.change(usec: 0)
      sub = described_class.start_from(booking(starts_at: start), interval_unit: "month", interval_count: 3, auto_charge: false)

      expect(sub.next_run_at).to eq(start + 3.months)
      expect(sub.auto_charge).to be(false)
      expect(sub.frequency_label).to eq("Every 3 months")
    end
  end

  describe "#frequency_label" do
    it "reads naturally for common cadences" do
      s = described_class.new(interval_unit: "week", interval_count: 1)
      expect(s.frequency_label).to eq("Weekly")
      s.interval_count = 2
      expect(s.frequency_label).to eq("Every 2 weeks")
    end
  end
end
