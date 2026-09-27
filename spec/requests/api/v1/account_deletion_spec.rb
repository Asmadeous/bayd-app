require "rails_helper"

RSpec.describe "Account deletion", type: :request do
  let(:service)  { create(:service, name: "Manicure", duration_minutes: 60, price: 80) }
  let(:tech)     { create(:employee_profile, user: create(:user, email: "tech@baydspa.ca", role: :employee)) }
  let(:customer) { create(:user, first_name: "Ada") }
  let!(:admin)   { create(:user, role: :admin) }

  before { allow(SquareService).to receive(:disable_card).and_return(true) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def booking(user: customer, employee: tech, starts_at: 3.days.from_now, status: "confirmed")
    Booking.create!(user: user, employee_profile: employee, service: service, starts_at: starts_at,
                    ends_at: starts_at + 1.hour, status: status, subtotal: 80, travel_fee: 0, total: 80)
  end

  def delete_account(user, confirm: "DELETE")
    delete "/api/v1/account", params: { confirm: confirm }, headers: auth_header(user), as: :json
  end

  describe "GET /api/v1/account/deletion_preview" do
    it "lists the customer's upcoming bookings and whether each was paid" do
      paid = booking
      paid.payments.create!(amount: 80, status: "paid", method: "card", processor: "square", paid_at: Time.current)
      booking(starts_at: 2.days.ago, status: "completed")

      get "/api/v1/account/deletion_preview", headers: auth_header(customer)

      body = response.parsed_body
      expect(body["blocked_reason"]).to be_nil
      expect(body["upcoming_bookings"].map { |b| b.slice("id", "service", "paid") })
        .to eq([ { "id" => paid.id, "service" => "Manicure", "paid" => true } ])
    end

    it "explains why a tech with upcoming jobs can't delete yet" do
      booking
      get "/api/v1/account/deletion_preview", headers: auth_header(tech.user)
      expect(response.parsed_body["blocked_reason"]).to eq("Ask the office to reassign your 1 upcoming job first.")
    end
  end

  describe "DELETE /api/v1/account" do
    it "deletes a customer's account and cancels their upcoming bookings" do
      upcoming = booking
      delete_account(customer)

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq("deleted" => true)
      expect(customer.reload.deleted_at).to be_present
      expect(upcoming.reload).to be_cancelled
    end

    it "requires the confirm word" do
      delete_account(customer, confirm: "yes")
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to eq("Type DELETE to confirm.")
      expect(customer.reload.deleted_at).to be_nil
    end

    it "tells admins to review refunds when a paid upcoming booking is cancelled" do
      b = booking
      b.payments.create!(amount: 80, status: "paid", method: "card", processor: "square", paid_at: Time.current)
      delete_account(customer)

      note = Notification.find_by(user: admin, kind: "booking_cancelled", title: "A customer deleted their account")
      expect(note.body).to include("##{b.id} Manicure", "$80.00 paid")
    end

    it "does not bother admins when nothing paid was cancelled" do
      booking
      delete_account(customer)
      expect(Notification.where(user: admin, title: "A customer deleted their account")).to be_empty
    end

    it "refuses a tech with upcoming jobs" do
      booking
      delete_account(tech.user)
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to include("reassign your 1 upcoming job")
      expect(tech.user.reload.deleted_at).to be_nil
    end

    it "deletes a tech with no upcoming jobs and takes them off dispatch" do
      booking(starts_at: 2.days.ago, status: "completed")
      delete_account(tech.user)

      expect(response).to have_http_status(:ok)
      expect(tech.reload).to have_attributes(active: false, dispatchable: false)
    end

    it "refuses an admin" do
      delete_account(admin)
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to eq("Ask another admin to remove your account.")
    end

    it "can't be repeated with the old token" do
      delete_account(customer)
      delete_account(customer)
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
