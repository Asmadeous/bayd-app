require "rails_helper"

RSpec.describe AccountDeletion do
  let(:tech)    { create(:employee_profile) }
  let(:service) { create(:service, duration_minutes: 60, price: 80) }
  let(:customer) do
    create(:user, first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", phone: "+16045550123",
                  street_address: "1 Main St", city: "Toronto", postal_code: "M5V 1A1", google_uid: "g-123",
                  square_customer_id: "cust_1", square_card_id: "card_1", card_brand: "Visa", card_last4: "4242",
                  marketing_opt_in: true)
  end
  let!(:address) { customer.addresses.create!(line1: "1 Main St", city: "Toronto", province: "ON", postal_code: "M5V 1A1") }

  before { allow(SquareService).to receive(:disable_card).and_return(true) }

  def booking(starts_at:, status: "confirmed")
    Booking.create!(user: customer, employee_profile: tech, service: service, address: address,
                    starts_at: starts_at, ends_at: starts_at + 1.hour, status: status,
                    subtotal: 80, travel_fee: 0, total: 80, booked_for_name: "Ada L", booked_for_phone: "+16045550123",
                    notes: "Buzz 12", service_latitude: 43.6, service_longitude: -79.4)
  end

  it "erases the profile and marks the account deleted" do
    described_class.call(customer)
    customer.reload

    expect(customer.deleted_at).to be_present
    expect(customer.email).to eq("deleted-#{customer.id}@deleted.invalid")
    expect(customer.attributes.slice("first_name", "last_name", "phone", "street_address", "city", "postal_code",
                                     "google_uid", "square_card_id", "card_last4", "password_digest").values).to all(be_nil)
    expect(customer.marketing_opt_in).to be(false)
  end

  it "disables the saved Square card" do
    described_class.call(customer)
    expect(SquareService).to have_received(:disable_card).with("card_1")
  end

  it "removes addresses, device tokens, notifications, messages and the loyalty account" do
    create(:device_token, user: customer)
    create(:message, sender: customer, conversation: create(:conversation, participant_one: customer))
    Notification.create!(user: customer, kind: :booking_confirmed, title: "Hi")

    described_class.call(customer)

    expect(Address.where(user: customer)).to be_empty
    expect(DeviceToken.where(user: customer)).to be_empty
    expect(Message.where(sender: customer)).to be_empty
    expect(Notification.where(user: customer)).to be_empty
    expect(LoyaltyAccount.where(user: customer)).to be_empty
  end

  it "keeps past bookings and their payments, stripped of personal details" do
    past = booking(starts_at: 3.days.ago, status: "completed")
    past.payments.create!(amount: 80, status: "paid", method: "card", processor: "square", paid_at: 3.days.ago)

    described_class.call(customer)
    past.reload

    expect(past).to be_completed
    expect(past.payments.count).to eq(1)
    expect(past.attributes.slice("booked_for_name", "booked_for_phone", "notes", "service_latitude",
                                 "service_longitude", "address_id").values).to all(be_nil)
  end

  it "cancels upcoming bookings and returns them" do
    upcoming = booking(starts_at: 3.days.from_now)

    cancelled = described_class.call(customer)

    expect(cancelled).to eq([ upcoming ])
    expect(upcoming.reload).to be_cancelled
    expect(upcoming.cancellation_reason).to eq("Account deleted")
  end

  it "takes a deleted tech off dispatch" do
    described_class.call(tech.user)
    expect(tech.reload).to have_attributes(active: false, dispatchable: false)
  end

  describe "signing out everywhere", type: :request do
    it "stops a token issued before deletion from working" do
      token = JWT.encode({ sub: customer.id, role: customer.role, exp: 30.days.from_now.to_i },
                         ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
      headers = { "Authorization" => "Bearer #{token}" }
      get "/api/v1/notifications", headers: headers
      expect(response).to have_http_status(:ok)

      described_class.call(customer)

      get "/api/v1/notifications", headers: headers
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
