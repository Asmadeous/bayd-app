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
end
