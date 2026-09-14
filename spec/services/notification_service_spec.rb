require "rails_helper"

RSpec.describe NotificationService, type: :service do
  let(:user) { create(:user) }

  it "persists an in-app notification and triggers a push" do
    allow(PushService).to receive(:push)

    expect {
      described_class.deliver(user: user, kind: "review_request", title: "Rate us", body: "How was it?")
    }.to change { user.notifications.count }.by(1)

    expect(PushService).to have_received(:push).with(
      hash_including(user: user, title: "Rate us", body: "How was it?")
    )
  end

  it "still returns the notification if the push blows up (best-effort)" do
    allow(PushService).to receive(:push).and_raise(StandardError, "fcm down")
    notification = described_class.deliver(user: user, kind: "review_request", title: "x")
    expect(notification).to be_persisted
  end
end
