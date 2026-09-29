require "rails_helper"

# Buying a gift card starts a payment: Helcim on the website, a Square hosted
# page in the apps (gateway=square). The webhook later activates the card by
# its GC-<id> reference.
RSpec.describe "POST /api/v1/gift_cards", type: :request do
  let(:user) { create(:user, email: "buyer@example.com", first_name: "Ana") }

  def auth_header(u)
    token = JWT.encode({ sub: u.id, role: u.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def buy(params)
    post "/api/v1/gift_cards", params: params, headers: auth_header(user), as: :json
  end

  it "uses a Square hosted page tagged with the card's reference when the app asks for Square" do
    allow(SquareService).to receive(:create_reference_link).and_return(success: true, url: "https://square.link/u/abc")

    buy(amount: 50, gateway: "square")

    expect(response).to have_http_status(:created)
    card = GiftCard.last
    expect(response.parsed_body).to include("gateway" => "square", "redirect_url" => "https://square.link/u/abc",
                                            "gift_card_id" => card.id)
    expect(SquareService).to have_received(:create_reference_link).with(
      hash_including(reference: "GC-#{card.id}", line_items: [ hash_including(price_cents: 5000) ])
    )
    expect(card.active).to be(false) # activated by the webhook once paid
  end

  it "keeps Helcim for the website" do
    allow(HelcimService).to receive(:initialize_session).and_return(success: true, checkout_token: "tok")

    buy(amount: 25)

    expect(response).to have_http_status(:created)
    expect(response.parsed_body).to include("gateway" => "helcim", "checkout_token" => "tok")
  end

  it "accepts the $150 card the app offers" do
    allow(SquareService).to receive(:create_reference_link).and_return(success: true, url: "https://square.link/u/x")

    buy(amount: 150, gateway: "square")

    expect(response).to have_http_status(:created)
  end

  it "removes the unpaid card when the payment can't start" do
    allow(SquareService).to receive(:create_reference_link).and_return(success: false, error: "Square is down")

    expect { buy(amount: 50, gateway: "square") }.not_to change(GiftCard, :count)
    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body["error"]).to eq("Square is down")
  end
end
