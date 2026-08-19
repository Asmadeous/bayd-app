require "rails_helper"

# SimplyBook is email-keyed, so a phone-only guest booking can't be auto-synced.
# Instead of a half-synced booking, the request is captured as an admin
# follow-up (CallbackRequest) and the team is notified (in-app + email). A guest
# WITH an email, or any logged-in user, takes the normal booking path.
RSpec.describe "POST /api/v1/booking_requests — email gate", type: :request do
  let!(:service) { create(:service) }
  let!(:admin)   { create(:user, email: "owner@baydspa.ca", role: :admin) }

  let(:address_params) do
    { line1: "123 Main St", city: "Brampton", province: "ON", postal_code: "L6X 1A1" }
  end
  let(:booking_params) do
    { service_id: service.id, client_type: "adult", requested_start: "2026-09-01T14:00:00" }
  end

  context "guest with NO email (phone only)" do
    let(:params) do
      { customer: { first_name: "Phone", last_name: "Guy", phone: "+16049230310" },
        address: address_params, booking_request: booking_params }
    end

    it "does not create a booking; creates a follow-up callback request" do
      expect {
        post "/api/v1/booking_requests", params: params, as: :json
      }.to change(CallbackRequest, :count).by(1)
        .and change(Booking, :count).by(0)
        .and change(BookingRequest, :count).by(0)

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json["status"]).to eq("follow_up")

      cr = CallbackRequest.last
      expect(cr.contact_phone).to eq("+16049230310")
      expect(cr.contact_name).to eq("Phone Guy")
      expect(cr.notes).to include("PHONE BOOKING")
      expect(cr.notes).to include("L6X 1A1")   # address captured for manual booking
      expect(cr.notes).to include("2026-09-01") # requested time captured
    end

    it "notifies every admin in-app" do
      expect {
        post "/api/v1/booking_requests", params: params, as: :json
      }.to change { Notification.where(kind: "booking_follow_up", user: admin).count }.by(1)
    end

    it "enqueues the admin follow-up email" do
      expect {
        post "/api/v1/booking_requests", params: params, as: :json
      }.to have_enqueued_mail(AdminMailer, :booking_follow_up)
    end
  end

  context "guest WITH an email" do
    it "does NOT create a follow-up (takes the normal booking path)" do
      params = { customer: { first_name: "Emailed", email: "has@email.com", phone: "+15550001111" },
                 address: address_params, booking_request: booking_params }

      expect {
        post "/api/v1/booking_requests", params: params, as: :json
      }.to change(CallbackRequest, :count).by(0)
      # No booking is asserted here (assignment may fail without a mapped tech),
      # but the point is the email gate did NOT divert it to a follow-up.
      expect(JSON.parse(response.body)["status"]).not_to eq("follow_up")
    end
  end
end
