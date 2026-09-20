require "rails_helper"

RSpec.describe Booking, type: :model do
  let(:service)  { create(:service, duration_minutes: 60, price: 100) }
  let(:tech)     { create(:employee_profile) }
  let(:customer) { create(:user) }

  def build_booking(status: "confirmed", starts_at: 1.day.from_now)
    Booking.create!(
      user: customer, employee_profile: tech, service: service,
      status: status, client_type: "adult", party_size: 1,
      starts_at: starts_at, ends_at: starts_at + 1.hour,
      subtotal: 100, travel_fee: 0, total: 100
    )
  end

  describe "missed status" do
    it "is a valid status" do
      booking = build_booking(status: "missed")
      expect(booking.missed?).to be(true)
    end

    it "appears in the :past scope" do
      booking = build_booking(status: "missed")
      expect(Booking.past).to include(booking)
    end

    it "does NOT trigger a no-show charge (client is never charged)" do
      booking = build_booking(status: "confirmed")
      expect(NoShowChargeJob).not_to receive(:perform_later)
      booking.update!(status: :missed)
    end

    it "records no square_no_show payment when marked missed" do
      booking = build_booking(status: "confirmed")
      expect { booking.update!(status: :missed) }
        .not_to change { booking.payments.where(processor: "square_no_show").count }
    end

    it "fires BookingMissedJob on the missed transition" do
      booking = build_booking(status: "confirmed")
      expect(BookingMissedJob).to receive(:perform_later).with(booking.id)
      booking.update!(status: :missed)
    end
  end
end
