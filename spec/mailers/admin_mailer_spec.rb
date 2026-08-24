require "rails_helper"

RSpec.describe AdminMailer, type: :mailer do
  describe "#booking_follow_up" do
    let(:cr) do
      CallbackRequest.create!(
        contact_name: "Phone Guy", contact_phone: "+16049230310",
        postal_code: "L6X 1A1", notes: "PHONE BOOKING — needs manual entry\nAddress: 123 Main St",
        status: "new"
      )
    end

    it "goes to the team inbox with the customer's phone in the body" do
      mail = described_class.booking_follow_up(cr)
      expect(mail.subject).to include("Phone booking follow-up")
      expect(mail.to).to eq([ ENV.fetch("ADMIN_NOTIFY_EMAIL", ENV.fetch("SUPPORT_EMAIL", "Bookings@baydspa.ca")) ])
      expect(mail.body.encoded).to include("+16049230310")
      expect(mail.body.encoded).to include("123 Main St")
    end
  end

  describe "#booking_addons" do
    let(:tech_user) { create(:user, first_name: "Susi", last_name: "N") }
    let(:tech)      { create(:employee_profile, user: tech_user) }
    let(:customer)  { create(:user, first_name: "Ada") }
    let(:service)   { create(:service, name: "Manicure", duration_minutes: 30, price: 40) }
    let(:booking) do
      start = BusinessHours.zone.parse("#{Date.current + 3} 10:00")
      Booking.create!(user: customer, service: service, employee_profile: tech,
                      starts_at: start, ends_at: start + 30.minutes,
                      status: "confirmed", subtotal: 40, travel_fee: 0, total: 40)
    end
    let(:addons) { [ { id: 2, name: "Pedicure", price: 50, duration: 60 } ] }

    it "goes to the team inbox and lists the add-ons + tech name" do
      mail = described_class.booking_addons(booking, addons)
      expect(mail.subject).to include("Booking add-ons", "Ada")
      expect(mail.to).to eq([ ENV.fetch("ADMIN_NOTIFY_EMAIL", ENV.fetch("SUPPORT_EMAIL", "Bookings@baydspa.ca")) ])
      expect(mail.body.encoded).to include("Pedicure")
      expect(mail.body.encoded).to include("Susi") # technician name from the associated user
    end
  end
end
