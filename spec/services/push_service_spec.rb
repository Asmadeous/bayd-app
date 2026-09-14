require "rails_helper"

RSpec.describe PushService, type: :service do
  let(:user) { create(:user) }

  def fake_client(configured: true)
    instance_double(Fcm::Client, configured?: configured)
  end

  it "sends to each of the user's device tokens" do
    create(:device_token, user: user, token: "a")
    create(:device_token, user: user, token: "b")
    client = fake_client
    allow(Fcm::Client).to receive(:new).and_return(client)
    allow(client).to receive(:send_to).and_return(:ok)

    described_class.push(user: user, title: "Hi", body: "There")

    expect(client).to have_received(:send_to).with(hash_including(token: "a")).once
    expect(client).to have_received(:send_to).with(hash_including(token: "b")).once
  end

  it "prunes a token FCM reports as unregistered" do
    create(:device_token, user: user, token: "dead")
    client = fake_client
    allow(Fcm::Client).to receive(:new).and_return(client)
    allow(client).to receive(:send_to).and_return(:unregistered)

    expect { described_class.push(user: user, title: "x", body: "y") }
      .to change { user.device_tokens.count }.by(-1)
  end

  it "no-ops when FCM is unconfigured" do
    create(:device_token, user: user, token: "a")
    client = fake_client(configured: false)
    allow(Fcm::Client).to receive(:new).and_return(client)
    expect(client).not_to receive(:send_to)
    described_class.push(user: user, title: "x", body: "y")
  end

  it "never raises into the caller" do
    create(:device_token, user: user, token: "a")
    client = fake_client
    allow(Fcm::Client).to receive(:new).and_return(client)
    allow(client).to receive(:send_to).and_raise(StandardError, "boom")
    expect { described_class.push(user: user, title: "x", body: "y") }.not_to raise_error
  end
end
