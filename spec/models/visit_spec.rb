require "rails_helper"

RSpec.describe Visit do
  let(:user)  { create(:user) }
  let(:visit) { create(:visit, user: user) }
  let(:start) { 2.days.from_now.change(hour: 14) }

  def line(position, status: "confirmed", total: 50, offset: position.hours)
    create(:booking, user: user, visit: visit, visit_position: position, status: status,
           starts_at: start + offset, ends_at: start + offset + 1.hour, subtotal: total, total: total)
  end

  it "orders its bookings by position" do
    second = line(1)
    first  = line(0)
    expect(visit.reload.bookings).to eq([ first, second ])
  end

  describe "#status" do
    it "is in_progress while any line is underway" do
      line(0, status: "completed")
      line(1, status: "in_progress")
      expect(visit.reload.status).to eq("in_progress")
    end

    it "stays confirmed while a line is still due" do
      line(0, status: "cancelled")
      line(1, status: "confirmed")
      expect(visit.reload.status).to eq("confirmed")
    end

    it "is cancelled only when every line is cancelled" do
      line(0, status: "cancelled")
      line(1, status: "cancelled")
      expect(visit.reload.status).to eq("cancelled")
    end

    it "is completed once the remaining lines are done" do
      line(0, status: "completed")
      line(1, status: "cancelled")
      expect(visit.reload.status).to eq("completed")
    end
  end

  it "sums money across its lines" do
    line(0, total: 40)
    line(1, total: 55.5)
    expect(visit.reload.total).to eq(95.5.to_d)
    expect(visit.outstanding_balance).to eq(95.5.to_d)
  end

  it "syncs its window to the active lines" do
    line(0, status: "cancelled")
    b = line(1)
    line(2)
    visit.reload.sync_window!
    expect(visit.starts_at).to eq(b.starts_at)
    expect(visit.ends_at).to eq(start + 3.hours)
  end
end
