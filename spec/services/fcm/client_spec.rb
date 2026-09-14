require "rails_helper"

RSpec.describe Fcm::Client, type: :service do
  around do |example|
    ENV["FCM_PROJECT_ID"] = "bayd-test"
    ENV["FCM_CREDENTIALS_JSON"] = '{"type":"service_account"}'
    example.run
  ensure
    ENV.delete("FCM_PROJECT_ID")
    ENV.delete("FCM_CREDENTIALS_JSON")
  end

  # Never mint a real OAuth2 token in specs.
  before do
    authorizer = instance_double(Google::Auth::ServiceAccountCredentials,
                                 fetch_access_token!: { "access_token" => "ya29.fake" })
    allow(Google::Auth::ServiceAccountCredentials).to receive(:make_creds).and_return(authorizer)
  end

  def stub_fcm(status:, body: "{}")
    conn = instance_double(Faraday::Connection)
    resp = instance_double(Faraday::Response, success?: status < 300, status: status, body: body)
    # capture what got posted
    allow(conn).to receive(:post) do |path, &blk|
      req = Struct.new(:headers, :body).new({}, nil)
      blk.call(req)
      @posted = { path: path, headers: req.headers, body: JSON.parse(req.body) }
      resp
    end
    allow(Faraday).to receive(:new).and_return(conn)
  end

  it "posts to the FCM v1 endpoint with the message body shape" do
    stub_fcm(status: 200)
    result = described_class.new.send_to(token: "dev-1", title: "Hi", body: "There", data: { booking_id: 7 })

    expect(result).to eq(:ok)
    expect(@posted[:path]).to eq("/v1/projects/bayd-test/messages:send")
    expect(@posted[:headers]["Authorization"]).to eq("Bearer ya29.fake")
    msg = @posted[:body]["message"]
    expect(msg["token"]).to eq("dev-1")
    expect(msg["notification"]).to eq("title" => "Hi", "body" => "There")
    expect(msg["data"]).to eq("booking_id" => "7") # values stringified
  end

  it "returns :unregistered on a 404 so the caller can prune the token" do
    stub_fcm(status: 404, body: '{"error":{"status":"NOT_FOUND"}}')
    expect(described_class.new.send_to(token: "dead", title: "x", body: "y")).to eq(:unregistered)
  end

  it "returns :error on other failures" do
    stub_fcm(status: 500)
    expect(described_class.new.send_to(token: "t", title: "x", body: "y")).to eq(:error)
  end

  it "is a no-op when unconfigured (no HTTP call)" do
    ENV.delete("FCM_PROJECT_ID")
    expect(Faraday).not_to receive(:new)
    expect(described_class.new.send_to(token: "t", title: "x", body: "y")).to eq(:skipped)
  end
end
