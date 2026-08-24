require "rails_helper"

# Regression guard: request.parsed_body is NOT available on ActionDispatch::Request
# in these API controllers (Rails 8.1 here — it raises NoMethodError), so every
# webhook must parse the raw JSON body itself. Before the fix, a real callback
# 500'd. These specs POST a JSON body and assert the webhook does NOT 500 and
# records the parsed payload. Signature verification is left unconfigured so we
# exercise the parse path; downstream processors are stubbed.
RSpec.describe "Webhooks — raw JSON body parsing", type: :request do
  def json_post(path, payload, headers = {})
    post path, params: payload.to_json,
               headers: { "CONTENT_TYPE" => "application/json" }.merge(headers)
  end

  describe "POST /api/v1/webhooks/square" do
    before { allow(PaymentWebhookProcessor).to receive(:square) }

    it "parses the JSON body and records the event (no 500)" do
      around_env("SQUARE_WEBHOOK_SIGNATURE_KEY", nil) do
        expect {
          json_post "/api/v1/webhooks/square",
                    { event_id: "evt_sq_1", type: "payment.updated", data: { object: {} } }
        }.to change(SyncEvent, :count).by(1)
      end

      expect(response).to have_http_status(:ok)
      event = SyncEvent.find_by(provider: "square", external_id: "evt_sq_1")
      expect(event.payload["type"]).to eq("payment.updated")
      expect(PaymentWebhookProcessor).to have_received(:square)
    end

    it "does not 500 on an empty body (the parse bug we're guarding against)" do
      around_env("SQUARE_WEBHOOK_SIGNATURE_KEY", nil) do
        post "/api/v1/webhooks/square", headers: { "CONTENT_TYPE" => "application/json" }
      end
      # An empty body is a handled non-event, NOT the NoMethodError 500 that
      # request.parsed_body used to raise.
      expect(response).not_to have_http_status(:internal_server_error)
    end
  end

  describe "POST /api/v1/webhooks/simplybook" do
    before { allow_any_instance_of(SimplyBook::WebhookProcessor).to receive(:call) }

    it "parses the JSON body and records the event (no 500)" do
      around_env("SIMPLYBOOK_WEBHOOK_SECRET", nil) do
        expect {
          json_post "/api/v1/webhooks/simplybook",
                    { notification_id: "note-1", event: "create" }
        }.to change(SyncEvent, :count).by(1)
      end

      expect(response).to have_http_status(:ok)
      event = SyncEvent.find_by(provider: "simplybook", external_id: "note-1")
      expect(event.payload["event"]).to eq("create")
    end
  end

  describe "POST /api/v1/webhooks/hpay (Helcim)" do
    before { allow(PaymentWebhookProcessor).to receive(:helcim) }

    it "parses the JSON body and records the event (no 500)" do
      around_env("HELCIM_WEBHOOK_VERIFIER_TOKEN", nil) do
        expect {
          json_post "/api/v1/webhooks/hpay", { id: "txn_h_1", type: "transaction" }
        }.to change(SyncEvent, :count).by(1)
      end

      expect(response).to have_http_status(:ok)
      event = SyncEvent.find_by(provider: "helcim", external_id: "txn_h_1")
      expect(event.payload["type"]).to eq("transaction")
      expect(PaymentWebhookProcessor).to have_received(:helcim)
    end
  end

  describe "POST /api/v1/webhooks/traccar" do
    before { allow_any_instance_of(Traccar::WebhookProcessor).to receive(:call) }

    it "parses the JSON body and stores it as the payload (no 500)" do
      around_env("TRACCAR_WEBHOOK_SECRET", "s3cret") do
        json_post "/api/v1/webhooks/traccar",
                  { positions: [ { deviceId: "dev-1", latitude: 43.6, longitude: -79.6 } ] },
                  { "X-Traccar-Secret" => "s3cret" }
      end

      expect(response).to have_http_status(:ok)
      event = SyncEvent.find_by(provider: "traccar")
      expect(event.payload["positions"].first["deviceId"]).to eq("dev-1")
    end

    it "rejects a bad secret before parsing" do
      around_env("TRACCAR_WEBHOOK_SECRET", "s3cret") do
        json_post "/api/v1/webhooks/traccar", { positions: [] }, { "X-Traccar-Secret" => "wrong" }
      end
      expect(response).to have_http_status(:unauthorized)
    end
  end

  # Temporarily set an ENV var (or delete it when value is nil) for the block.
  def around_env(key, value)
    original = ENV[key]
    value.nil? ? ENV.delete(key) : ENV[key] = value
    yield
  ensure
    original.nil? ? ENV.delete(key) : ENV[key] = original
  end
end
