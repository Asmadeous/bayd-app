require "rails_helper"

RSpec.describe SimplyBook::Client do
  # A stand-in Faraday response.
  def resp(status, body)
    instance_double(Faraday::Response, status: status, success?: status.between?(200, 299), body: body)
  end

  # A fake connection that answers get/post from queues we control. Any
  # Faraday.new call in the client returns this same fake, so NO real HTTP
  # is ever performed.
  let(:conn) { instance_double(Faraday::Connection) }

  before do
    # Every Faraday.new (auth conn, admin @conn, public auth, public_conn) yields
    # our fake connection. The block passed to Faraday.new is ignored.
    allow(Faraday).to receive(:new).and_return(conn)

    # Admin + public auth token fetches.
    allow(conn).to receive(:post).with("/admin/auth", anything).and_return(resp(200, { "token" => "admin-tok" }))
    allow(conn).to receive(:post).with("/public/auth/token", anything).and_return(resp(200, { "token" => "public-tok" }))
  end

  describe "#register_client" do
    it "finds an existing client by email and returns its id (best-effort remind)" do
      allow(conn).to receive(:get)
        .with("/admin/clients", "filter[search]" => "jane@example.com")
        .and_return(resp(200, { "data" => [ { "id" => "77", "email" => "jane@example.com" } ] }))
      allow(conn).to receive(:post)
        .with("/public/clients/remind-password", { email: "jane@example.com" })
        .and_return(resp(200, {}))

      id = described_class.new.register_client(name: "Jane", email: "jane@example.com")

      expect(id).to eq("77")
    end

    it "creates the client when none exists, then returns the new id" do
      allow(conn).to receive(:get)
        .with("/admin/clients", "filter[search]" => "new@example.com")
        .and_return(resp(200, { "data" => [] }))
      allow(conn).to receive(:post)
        .with("/admin/clients", { name: "New", email: "new@example.com" })
        .and_return(resp(201, { "id" => "99" }))
      allow(conn).to receive(:post)
        .with("/public/clients/remind-password", { email: "new@example.com" })
        .and_return(resp(200, {}))

      id = described_class.new.register_client(name: "New", email: "new@example.com")

      expect(id).to eq("99")
    end

    it "returns nil for a blank email without any HTTP client lookups" do
      expect(conn).not_to receive(:get)

      expect(described_class.new.register_client(name: "X", email: "   ")).to be_nil
    end

    it "is best-effort: never raises, returns nil when resolution fails" do
      # The client lookup blows up; resolve_client_id rescues to nil, so
      # register_client returns nil (cid blank) without raising.
      allow(conn).to receive(:get).and_raise(Faraday::ConnectionFailed.new("boom"))

      expect {
        @result = described_class.new.register_client(name: "Jane", email: "jane@example.com")
      }.not_to raise_error
      expect(@result).to be_nil
    end

    it "still returns the id when the remind-password email fails" do
      allow(conn).to receive(:get)
        .with("/admin/clients", "filter[search]" => "jane@example.com")
        .and_return(resp(200, { "data" => [ { "id" => "77", "email" => "jane@example.com" } ] }))
      allow(conn).to receive(:post)
        .with("/public/clients/remind-password", anything)
        .and_raise(Faraday::TimeoutError.new("slow"))

      id = described_class.new.register_client(name: "Jane", email: "jane@example.com")

      expect(id).to eq("77") # remind is non-fatal
    end
  end

  describe "#create_booking with a client tier" do
    let(:starts_at) { Time.zone.parse("2026-08-20 10:00:00") }
    let(:ends_at)   { Time.zone.parse("2026-08-20 11:00:00") }

    before do
      # No client hash → skip client resolution. Booking POST succeeds.
      allow(conn).to receive(:post).with("/admin/bookings", anything)
        .and_return(resp(200, { "bookings" => [ { "id" => "555" } ] }))
      allow(conn).to receive(:put).and_return(resp(200, {}))
    end

    # additional_fields push is DISABLED (see client.rb) — tied to repeated slow
    # (5s+) requests that ended in a SimplyBook 404 on real bookings (#135, #136).
    # Re-enable this test alongside the additional_fields code once the intake
    # field setup is confirmed correct on SimplyBook's side.
    it "never sends additional_fields, even when tier is given" do
      described_class.new.create_booking(
        service_id: "2", unit_id: "3", starts_at: starts_at, ends_at: ends_at, tier: "elderly"
      )

      expect(conn).to have_received(:post).with(
        "/admin/bookings", hash_excluding(:additional_fields)
      )
    end
  end

  describe "#create_booking_result — batch + sequential" do
    let(:starts_at) { Time.zone.parse("2026-08-20 10:00:00") }
    let(:ends_at)   { Time.zone.parse("2026-08-20 11:00:00") }

    before do
      allow(conn).to receive(:post).with("/admin/bookings", anything)
        .and_return(resp(200, { "bookings" => [ { "id" => "900" } ], "batch" => { "id" => 42 } }))
      allow(conn).to receive(:put).and_return(resp(200, {}))
    end

    it "returns both the booking id and the batch id" do
      result = described_class.new.create_booking_result(service_id: "2", unit_id: "3", starts_at: starts_at, ends_at: ends_at)
      expect(result).to eq(id: "900", batch_id: 42)
    end

    it "sends batch_id and is_sequential when given (service add-ons)" do
      described_class.new.create_booking_result(
        service_id: "2", unit_id: "3", starts_at: starts_at, ends_at: ends_at,
        batch_id: 42, is_sequential: true
      )
      expect(conn).to have_received(:post).with(
        "/admin/bookings", hash_including(batch_id: 42, is_sequential: true)
      )
    end

    it "omits batch_id and is_sequential when not given" do
      described_class.new.create_booking_result(service_id: "2", unit_id: "3", starts_at: starts_at, ends_at: ends_at)
      expect(conn).to have_received(:post).with(
        "/admin/bookings", hash_excluding(:batch_id, :is_sequential)
      )
    end
  end
end
