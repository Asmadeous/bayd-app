require "rails_helper"

RSpec.describe BookingReminderJob, "on a multi-service visit", type: :job do
  let(:customer) { create(:user, first_name: "Ada") }
  let(:dana) { create(:employee_profile, user: create(:user, first_name: "Dana", email: "dana@baydspa.ca", role: :employee)) }
  let(:susi) { create(:employee_profile, user: create(:user, first_name: "Susi", email: "susi@baydspa.ca", role: :employee)) }
  let(:lash) { create(:service, name: "Lash Lift") }
  let(:pedi) { create(:service, name: "Pedicure") }
  let(:start) { 3.days.from_now.change(hour: 14) }
  let(:visit) { create(:visit, user: customer, starts_at: start, ends_at: start + 2.hours) }
  let!(:first_line) { line(0, lash, dana) }
  let!(:second_line) { line(1, pedi, susi) }

  def line(position, service, tech)
    create(:booking, user: customer, visit: visit, visit_position: position, service: service, employee_profile: tech,
           starts_at: start + position.hours, ends_at: start + (position + 1).hours)
  end

  it "confirms to the customer once, naming every service" do
    described_class.perform_now(first_line.id, "confirmed")
    described_class.perform_now(second_line.id, "confirmed")

    notes = customer.notifications.where(kind: "booking_confirmed")
    expect(notes.count).to eq(1)
    expect(notes.first.body).to start_with("Lash Lift + Pedicure is booked for")
  end

  it "moves the customer's reminders to the next line if the first is cancelled" do
    first_line.update_columns(status: "cancelled")
    described_class.perform_now(second_line.id, "confirmed")
    expect(customer.notifications.where(kind: "booking_confirmed").first.body).to start_with("Pedicure is booked")
  end

  it "tells each tech about their own job and who they share the visit with" do
    described_class.perform_now(first_line.id, "assigned")
    described_class.perform_now(second_line.id, "assigned")

    dana_note = dana.user.notifications.find_by(kind: "booking_assigned")
    susi_note = susi.user.notifications.find_by(kind: "booking_assigned")
    expect(dana_note.title).to eq("New booking")
    expect(dana_note.body).to start_with("Lash Lift for Ada on")
    expect(dana_note.body).to end_with("Shared visit with Susi (Pedicure).")
    expect(susi_note.body).to end_with("Shared visit with Dana (Lash Lift).")
    expect(customer.notifications.where(kind: "booking_assigned")).to be_empty
  end

  it "notifies the tech of a standalone booking without a shared note" do
    solo = create(:booking, user: customer, service: pedi, employee_profile: susi,
                            starts_at: start + 5.hours, ends_at: start + 6.hours)
    described_class.perform_now(solo.id, "assigned")
    expect(susi.user.notifications.find_by(kind: "booking_assigned", booking: solo).body).to end_with(".")
    expect(susi.user.notifications.find_by(booking: solo).body).not_to include("Shared")
  end
end
