require "rails_helper"

# Focuses on AssignmentService#register_simplybook_client — the guard that makes
# sure a booking customer is registered in SimplyBook exactly once (never twice)
# and only when SimplyBook is configured. The SimplyBook HTTP client is always
# stubbed so no real request is made.
RSpec.describe AssignmentService, "#register_simplybook_client" do
  # The method is private and reads @booking_request.user for the payload, but
  # takes the created booking as its argument.
  def onboard(service, booking)
    service.send(:register_simplybook_client, booking)
  end

  let(:user)            { create(:user, email: "tech-test@example.com", simplybook_client_id: nil) }
  let(:booking_request) { create(:booking_request, user: user) }
  let(:service)         { described_class.new(booking_request) }
  let(:booking)         { instance_double("Booking", user: user, id: 123) }

  # Default to "configured" for the happy-path examples; individual examples can
  # override. Restore the real value afterward.
  around do |example|
    original = ENV["SIMPLYBOOK_COMPANY"]
    ENV["SIMPLYBOOK_COMPANY"] = "baydspa"
    example.run
  ensure
    ENV["SIMPLYBOOK_COMPANY"] = original
  end

  context "when the user has no SimplyBook client id yet" do
    it "registers them and stores the returned client id" do
      sb = instance_double(SimplyBook::Client, register_client: "SB-999")
      allow(SimplyBook::Client).to receive(:new).and_return(sb)

      onboard(service, booking)

      expect(sb).to have_received(:register_client).with(
        name: "Jane Doe", email: user.email, phone: user.phone
      )
      expect(user.reload.simplybook_client_id).to eq("SB-999")
    end

    it "does not store an id when registration returns nil (best-effort)" do
      sb = instance_double(SimplyBook::Client, register_client: nil)
      allow(SimplyBook::Client).to receive(:new).and_return(sb)

      onboard(service, booking)

      expect(user.reload.simplybook_client_id).to be_nil
    end
  end

  context "when the user ALREADY has a SimplyBook client id" do
    let(:user) { create(:user, simplybook_client_id: "SB-EXISTING") }

    it "skips entirely — never constructs the client (no double-create)" do
      allow(SimplyBook::Client).to receive(:new)

      onboard(service, booking)

      expect(SimplyBook::Client).not_to have_received(:new)
      expect(user.reload.simplybook_client_id).to eq("SB-EXISTING")
    end
  end

  context "when SimplyBook is not configured" do
    it "skips when SIMPLYBOOK_COMPANY is blank" do
      ENV["SIMPLYBOOK_COMPANY"] = ""
      allow(SimplyBook::Client).to receive(:new)

      onboard(service, booking)

      expect(SimplyBook::Client).not_to have_received(:new)
    end
  end

  context "when the SimplyBook call raises" do
    it "swallows the error (booking flow must not fail)" do
      allow(SimplyBook::Client).to receive(:new).and_raise(StandardError, "boom")

      expect { onboard(service, booking) }.not_to raise_error
      expect(user.reload.simplybook_client_id).to be_nil
    end
  end

  context "when there is no user" do
    it "no-ops on a nil-user booking" do
      allow(SimplyBook::Client).to receive(:new)
      onboard(service, instance_double("Booking", user: nil, id: 1))
      expect(SimplyBook::Client).not_to have_received(:new)
    end
  end
end
