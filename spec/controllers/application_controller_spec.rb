require "rails_helper"

# find_or_create_customer is the one place public booking/checkout resolves a
# not-logged-in customer — exercised here directly since it's private and used
# by multiple controllers (booking_requests, checkout).
RSpec.describe ApplicationController, type: :controller do
  controller do
    skip_before_action :authenticate_user!
    def create
      user = find_or_create_customer(params.require(:customer))
      render json: { id: user.id, email: user.email, phone: user.phone }
    end
  end

  before do
    routes.draw { post "create" => "anonymous#create" }
  end

  it "creates a customer from email alone" do
    post :create, params: { customer: { email: "e@example.com" } }
    expect(response).to have_http_status(:ok)
    expect(User.find_by(email: "e@example.com")).to be_present
  end

  it "creates a customer from phone alone (no email required)" do
    post :create, params: { customer: { phone: "+16471234567" } }
    expect(response).to have_http_status(:ok)
    user = User.find_by(phone: "+16471234567")
    expect(user).to be_present
    expect(user.email).to be_nil
  end

  it "400s when neither email nor phone is given" do
    post :create, params: { customer: { first_name: "No Contact" } }
    expect(response).to have_http_status(:bad_request)
  end

  it "matches an existing phone-only account on a repeat booking by phone" do
    existing = create(:user, email: nil, phone: "+16479998888", role: :customer, first_name: "Original")

    post :create, params: { customer: { phone: "+16479998888", first_name: "Updated" } }

    expect(User.count).to eq(1)
    expect(existing.reload.first_name).to eq("Updated")
  end

  it "matches an existing account by email even when phone is also given" do
    existing = create(:user, email: "match@example.com", role: :customer)

    post :create, params: { customer: { email: "match@example.com", phone: "+16470001111" } }

    expect(User.count).to eq(1)
    expect(existing.reload.phone).to eq("+16470001111")
  end
end
