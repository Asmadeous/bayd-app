require "rails_helper"

RSpec.describe Infobip::Client, type: :service do
  around do |example|
    ENV["INFOBIP_BASE_URL"] = "https://test.api.infobip.com"
    ENV["INFOBIP_API_KEY"]  = "key-123"
    ENV["INFOBIP_SENDER"]   = "BAYD"
    example.run
  ensure
    ENV.delete("INFOBIP_BASE_URL")
    ENV.delete("INFOBIP_API_KEY")
    ENV.delete("INFOBIP_SENDER")
  end

  def stub_infobip(status:)
    conn = instance_double(Faraday::Connection)
    resp = instance_double(Faraday::Response, success?: status < 300)
    allow(conn).to receive(:post) do |path, &blk|
      req = Struct.new(:headers, :body).new({}, nil)
      blk.call(req)
      @posted = { path: path, headers: req.headers, body: JSON.parse(req.body) }
      resp
    end
    allow(Faraday).to receive(:new).and_return(conn)
  end

  it "posts the verified Infobip body shape to /sms/3/messages" do
    stub_infobip(status: 200)
    expect(described_class.new.send_sms(to: "+14165550100", text: "code 123456")).to eq(:ok)

    expect(@posted[:path]).to eq("/sms/3/messages")
    expect(@posted[:headers]["Authorization"]).to eq("App key-123")
    msg = @posted[:body]["messages"].first
    expect(msg["sender"]).to eq("BAYD")
    expect(msg["destinations"]).to eq([ { "to" => "+14165550100" } ])
    expect(msg["content"]).to eq("text" => "code 123456")
  end

  it "returns :error on a failure response" do
    stub_infobip(status: 500)
    expect(described_class.new.send_sms(to: "+1", text: "x")).to eq(:error)
  end

  it "is a no-op when unconfigured (no HTTP call)" do
    ENV.delete("INFOBIP_API_KEY")
    expect(Faraday).not_to receive(:new)
    expect(described_class.new.send_sms(to: "+1", text: "x")).to eq(:skipped)
  end
end
