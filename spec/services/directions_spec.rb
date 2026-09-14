require "rails_helper"

RSpec.describe Directions, type: :service do
  # Two points ~5km apart in Toronto.
  let(:from) { [ 43.65, -79.38 ] }
  let(:to)   { [ 43.70, -79.42 ] }

  def stub_google(status:, body:)
    conn = instance_double(Faraday::Connection)
    resp = instance_double(Faraday::Response, success?: status < 300, status: status, body: body)
    allow(Faraday).to receive(:new).and_return(conn)
    allow(conn).to receive(:get).and_yield(double(params: {})).and_return(resp)
    conn
  end

  before do
    described_class.instance_variable_set(:@connection, nil)
    Rails.cache.clear
  end

  describe ".eta_minutes" do
    it "returns Google's driving duration (in minutes) when routing succeeds" do
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with("GOOGLE_MAPS_API_KEY").and_return("test-key")
      body = { status: "OK", routes: [ { legs: [ { duration: { value: 900 } } ] } ] }.to_json
      stub_google(status: 200, body: body)

      # 900s -> 15 min.
      expect(described_class.eta_minutes(*from, *to)).to eq(15)
    end

    it "prefers duration_in_traffic when Google provides it" do
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with("GOOGLE_MAPS_API_KEY").and_return("test-key")
      body = {
        status: "OK",
        routes: [ { legs: [ { duration: { value: 900 }, duration_in_traffic: { value: 1200 } } ] } ]
      }.to_json
      stub_google(status: 200, body: body)

      # 1200s -> 20 min (traffic wins).
      expect(described_class.eta_minutes(*from, *to)).to eq(20)
    end

    it "falls back to a straight-line estimate when no API key is set" do
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with("GOOGLE_MAPS_API_KEY").and_return(nil)
      expect(Faraday).not_to receive(:new)

      eta = described_class.eta_minutes(*from, *to)
      expect(eta).to be_a(Integer).and be > 0
    end

    it "falls back to a straight-line estimate when Google returns an error" do
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with("GOOGLE_MAPS_API_KEY").and_return("test-key")
      stub_google(status: 200, body: { status: "ZERO_RESULTS", routes: [] }.to_json)

      eta = described_class.eta_minutes(*from, *to)
      expect(eta).to be_a(Integer).and be > 0
    end

    it "returns nil when a coordinate is missing" do
      expect(described_class.eta_minutes(nil, -79.38, 43.70, -79.42)).to be_nil
    end
  end

  describe ".straight_line_minutes" do
    it "estimates travel time from distance at the average speed" do
      eta = described_class.straight_line_minutes(*from, *to)
      expect(eta).to be_a(Integer).and be > 0
    end
  end
end
