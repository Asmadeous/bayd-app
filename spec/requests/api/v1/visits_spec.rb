require "rails_helper"

RSpec.describe "Visits API", type: :request do
  let(:zone) { BusinessHours.zone }
  let(:date) { next_weekday(3) }
  let(:lash) { create(:service, name: "Lash Lift", duration_minutes: 60, price: 80) }
  let(:pedi) { create(:service, name: "Pedicure", duration_minutes: 60, price: 50) }
  let!(:dana) { tech(lash, "Dana") }
  let!(:susi) { tech(pedi, "Susi") }

  before { allow_any_instance_of(Address).to receive(:geocode) }

  def next_weekday(wday)
    d = Date.current + 1
    d += 1 until d.wday == wday
    d
  end

  def tech(service, name)
    ep = create(:employee_profile, user: create(:user, first_name: name), dispatchable: true,
                base_latitude: 43.66, base_longitude: -79.39)
    EmployeeService.create!(employee_profile: ep, service: service)
    create(:availability_schedule, employee_profile: ep, day_of_week: date.wday, start_time: "09:00", end_time: "17:00")
    ep
  end

  def token(u)
    JWT.encode({ sub: u.id, role: u.role, exp: 30.days.from_now.to_i },
               ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
  end
  def auth(u) = { "Authorization" => "Bearer #{token(u)}" }

  def payload(visit: {}, customer: { email: "ada@example.com", first_name: "Ada", phone: "+15550001111" })
    {
      customer: customer,
      address: { line1: "1 King St W", city: "Toronto", province: "ON", postal_code: "M5V 2T6", latitude: 43.65, longitude: -79.38 },
      visit: { service_ids: [ lash.id, pedi.id ], starts_at: "#{date.iso8601}T09:15:00" }.merge(visit)
    }
  end

  def json = JSON.parse(response.body)

  describe "POST /api/v1/visits" do
    it "books one line per service with its tech, as a guest" do
      post "/api/v1/visits", params: payload, as: :json

      expect(response).to have_http_status(:created)
      lines = json.dig("visit", "lines")
      expect(lines.map { |l| [ l.dig("service", "name"), l.dig("employee_profile", "id"), l["status"] ] })
        .to eq([ [ "Lash Lift", dana.id, "confirmed" ], [ "Pedicure", susi.id, "confirmed" ] ])
      expect(lines.first["visit_lines"].map { |l| l.dig("employee", "name") }).to eq([ "Susi" ])
      expect(json.dig("visit", "total").to_d).to eq(130)
      expect(json["payment"]).to eq("mode" => "none")
      expect(User.find_by(email: "ada@example.com").visits.count).to eq(1)
    end

    it "takes a pay-now visit through one payment link" do
      allow(SquareService).to receive(:create_reference_link).and_return(success: true, url: "https://pay.test/v")
      post "/api/v1/visits", params: payload(visit: { payment_timing: "pay_upfront", tip: 13 }), as: :json

      expect(response).to have_http_status(:created)
      expect(json["payment"]).to eq("mode" => "link", "url" => "https://pay.test/v")
      expect(json.dig("visit", "lines").map { |l| l["status"] }).to eq(%w[pending pending])
    end

    it "explains why a visit can't be booked" do
      post "/api/v1/visits", params: payload(visit: { starts_at: "#{date.iso8601}T18:30:00" }), as: :json
      expect(response).to have_http_status(:unprocessable_content)
      expect(json["code"]).to eq("outside_hours")

      post "/api/v1/visits", params: payload(visit: { service_ids: [] }), as: :json
      expect(json["code"]).to eq("invalid")
    end

    it "turns a phone-only guest into a follow-up request" do
      post "/api/v1/visits", params: payload(customer: { first_name: "Phone", phone: "+16045550000" }), as: :json
      expect(response).to have_http_status(:created)
      expect(json["status"]).to eq("follow_up")
      expect(CallbackRequest.last.notes).to include("Service ID: #{lash.id}, #{pedi.id}")
    end

    it "won't book against someone else's saved address" do
      other = create(:user)
      address = other.addresses.create!(line1: "9 Elm", city: "Toronto", province: "ON", postal_code: "M5V 2T6")
      me = create(:user, email: "me@example.com")
      post "/api/v1/visits", params: payload(visit: { address_id: address.id }, customer: { email: me.email }).except(:address), as: :json
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "GET /api/v1/visits" do
    it "lists only the signed-in customer's visits" do
      post "/api/v1/visits", params: payload, as: :json
      mine = User.find_by(email: "ada@example.com")
      create(:visit) # someone else's

      get "/api/v1/visits", headers: auth(mine)
      expect(json["data"].size).to eq(1)
      expect(json["data"].first["lines"].size).to eq(2)

      get "/api/v1/visits/#{Visit.where.not(user: mine).first.id}", headers: auth(mine)
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/visits/:id/pay" do
    it "charges the visit balance once" do
      post "/api/v1/visits", params: payload, as: :json
      mine = User.find_by(email: "ada@example.com")
      mine.update!(square_customer_id: "C", square_card_id: "K")
      allow(SquareService).to receive(:charge_card).and_return(success: true, payment_id: "P1")

      post "/api/v1/visits/#{mine.visits.first.id}/pay", headers: auth(mine), params: { tip: 10 }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json["mode"]).to eq("charged")
      expect(json.dig("visit", "outstanding_balance").to_d).to eq(0)
      expect(SquareService).to have_received(:charge_card).once.with(hash_including(amount_cents: 14_000))
    end
  end
end
