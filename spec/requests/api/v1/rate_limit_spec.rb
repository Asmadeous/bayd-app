require "rails_helper"

RSpec.describe "API rate limits", type: :request do
  around do |example|
    store = Rack::Attack.cache.store
    Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new
    example.run
  ensure
    Rack::Attack.cache.store = store
  end

  def token(u) = JWT.encode({ sub: u.id, exp: 1.day.from_now.to_i }, ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
  def auth(u) = { "Authorization" => "Bearer #{token(u)}" }

  def hit(times, headers = {})
    Array.new(times) { get "/api/v1/franchise", headers: headers; response.status }
  end

  it "limits anonymous callers per IP" do
    statuses = hit(121)
    expect(statuses.first(120)).to all(eq(200))
    expect(statuses.last).to eq(429)
  end

  it "counts signed-in users per account, not against their shared IP" do
    hit(121)
    expect(hit(200, auth(create(:user)))).to all(eq(200))
    expect(hit(200, auth(create(:user)))).to all(eq(200))
  end

  it "limits each signed-in account" do
    statuses = hit(301, auth(create(:user)))
    expect(statuses.last).to eq(429)
  end

  it "treats a forged token as anonymous" do
    hit(120)
    get "/api/v1/franchise", headers: { "Authorization" => "Bearer not-a-real-token" }
    expect(response).to have_http_status(:too_many_requests)
  end

  it "never throttles payment webhooks" do
    hit(121)
    post "/api/v1/webhooks/square", params: "{}", headers: { "CONTENT_TYPE" => "application/json" }
    expect(response).not_to have_http_status(:too_many_requests)
  end
end
