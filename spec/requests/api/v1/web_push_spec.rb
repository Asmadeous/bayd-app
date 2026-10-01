require "rails_helper"

# Website browser notifications: the key browsers subscribe with, saving a
# browser, and every notification also going to the user's browsers.
RSpec.describe "Web push", type: :request do
  let(:user) { create(:user, email: "ana@example.com") }
  let(:vapid) { OpenSSL::PKey::EC.generate("prime256v1") }
  let(:subscription) do
    { endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      keys: { p256dh: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
              auth: "BTBZMqHH6r4Tts7J_aSIgg" } }
  end

  def auth_header(u)
    token = JWT.encode({ sub: u.id, role: u.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  around do |example|
    WebPushClient.instance_variable_set(:@private_key, nil)
    original = ENV["VAPID_PRIVATE_KEY"]
    ENV["VAPID_PRIVATE_KEY"] = vapid.to_pem
    example.run
  ensure
    ENV["VAPID_PRIVATE_KEY"] = original
    WebPushClient.instance_variable_set(:@private_key, nil)
  end

  it "publishes the public key, or hides the feature without one" do
    get "/api/v1/web_push/key"
    expect(response.parsed_body["public_key"]).to eq(Base64.urlsafe_encode64(vapid.public_key.to_bn.to_s(2), padding: false))

    ENV["VAPID_PRIVATE_KEY"] = ""
    WebPushClient.instance_variable_set(:@private_key, nil)
    get "/api/v1/web_push/key"
    expect(response).to have_http_status(:not_found)
  end

  it "saves this browser once, and removes it on request" do
    2.times { post "/api/v1/web_push/subscriptions", params: { subscription: subscription }, headers: auth_header(user), as: :json }
    expect(user.web_push_subscriptions.count).to eq(1)

    delete "/api/v1/web_push/subscriptions", params: { endpoint: subscription[:endpoint] }, headers: auth_header(user), as: :json
    expect(user.web_push_subscriptions.count).to eq(0)
  end

  it "sends every notification to the user's browsers with a link on the site" do
    user.web_push_subscriptions.create!(endpoint: subscription[:endpoint], **subscription[:keys])

    expect {
      NotificationService.deliver(user: user, kind: :review_request, title: "How was it?",
                                  action_url: "#{ENV.fetch('APP_URL', 'http://localhost:3001')}/dashboard/customer/bookings")
    }.to have_enqueued_job(WebPushJob).with(user.id, "How was it?", "", "/dashboard/customer/bookings")
  end

  it "forgets a browser that unsubscribed" do
    sub = user.web_push_subscriptions.create!(endpoint: subscription[:endpoint], **subscription[:keys])
    allow(Faraday).to receive(:post).and_return(instance_double(Faraday::Response, status: 410, success?: false))

    WebPushJob.perform_now(user.id, "Hi", "", "/")

    expect(WebPushSubscription.exists?(sub.id)).to be(false)
  end
end
