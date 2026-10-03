require "rails_helper"

RSpec.describe "Payments per franchise" do
  let(:canada) { Franchise.default }
  let(:uk) { create(:franchise, slug: "uk") }

  describe "credentials" do
    it "stores keys encrypted and only reports whether they're there" do
      uk.update_credentials!("square", "access_token" => "uk-token", "bogus" => "x")
      uk.update_credentials!("square", "location_id" => "LUK", "access_token" => "")

      expect(uk.reload.credential("square", "access_token")).to eq("uk-token")
      expect(uk.credential("square", "location_id")).to eq("LUK")
      expect(uk.credentials["square"].keys).to contain_exactly("access_token", "location_id")
      expect(uk.credential_status["square"]).to include("access_token" => true, "location_id" => true, "application_id" => false)
      expect(uk.payments_configured?).to be(true)
      raw = Franchise.connection.select_value("SELECT gateway_credentials FROM franchises WHERE id = #{uk.id}")
      expect(raw).not_to include("uk-token")
    end

    it "lets only the default franchise fall back to the deploy's env keys" do
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with("SQUARE_ACCESS_TOKEN").and_return("env-token")
      expect(canada.credential("square", "access_token")).to eq("env-token")
      expect(uk.credential("square", "access_token")).to be_nil
    end
  end

  it "charges with the franchise's own Square account in its currency" do
    uk.update_credentials!("square", "access_token" => "uk-token", "location_id" => "LUK")
    stubs = Faraday::Adapter::Test::Stubs.new
    stubs.post("/v2/payments") do |env|
      body = JSON.parse(env.body)
      expect(body).to include("location_id" => "LUK", "amount_money" => { "amount" => 4550, "currency" => "GBP" })
      expect(env.request_headers["Authorization"]).to eq("Bearer uk-token")
      [ 200, { "Content-Type" => "application/json" }, { payment: { id: "P1", status: "COMPLETED" } }.to_json ]
    end
    original = SquareService.method(:connection)
    allow(SquareService).to receive(:connection) { original.call.tap { |conn| conn.adapter(:test, stubs) } }

    result = Current.set(franchise: uk) do
      SquareService.charge_card(customer_id: "C1", card_id: "K1", amount_cents: uk.minor_units(45.50))
    end
    expect(result).to include(success: true, payment_id: "P1")
  end

  it "keeps a card saved in one franchise out of another" do
    user = create(:user)
    user.payment_profiles.create!(franchise: uk, customer_ref: "C1", card_ref: "K1")
    expect(user.card_on_file?(uk)).to be(true)
    expect(user.card_on_file?(canada)).to be(false)
  end

  it "still treats a card saved before franchising as Canada's" do
    user = create(:user, square_customer_id: "C1", square_card_id: "K1")
    expect(user.card_on_file?(canada)).to be(true)
    expect(user.payment_profile(canada)).to have_attributes(customer_ref: "C1", card_ref: "K1")
    expect(user.card_on_file?(uk)).to be(false)
  end
end

RSpec.describe "POST /api/v1/webhooks/square/:franchise", type: :request do
  let!(:uk) { create(:franchise, slug: "uk") }
  let(:url) { "http://www.example.com/api/v1/webhooks/square/uk" }

  def sign(body, key) = Base64.strict_encode64(OpenSSL::HMAC.digest("SHA256", key, "#{url}#{body}"))

  it "verifies with the franchise's own key and settles its visit" do
    uk.update_credentials!("square", "webhook_signature_key" => "uk-sig-key")
    visit, booking = Current.set(franchise: uk) do
      v = create(:visit)
      b = create(:booking, visit: v, user: v.user, visit_position: 0, status: "pending", subtotal: 80, total: 80)
      b.payments.create!(amount: 80, status: "pending", method: "card", processor: "square")
      [ v, b ]
    end
    body = { event_id: "evt_1", type: "payment.updated",
             data: { object: { payment: { id: "P9", status: "COMPLETED", reference_id: "VST-#{visit.id}",
                                          amount_money: { amount: 8000, currency: "GBP" } } } } }.to_json

    post url, params: body, headers: { "x-square-hmacsha256-signature" => sign(body, "wrong-key"), "CONTENT_TYPE" => "application/json" }
    expect(response).to have_http_status(:unauthorized)

    post url, params: body, headers: { "x-square-hmacsha256-signature" => sign(body, "uk-sig-key"), "CONTENT_TYPE" => "application/json" }
    expect(response).to have_http_status(:ok)
    expect(booking.reload.payment_status).to eq("paid")
    expect(booking.status).to eq("confirmed")
  end
end
