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

  describe "email is gated to review requests only (no email flood)" do
    before { allow(PushService).to receive(:push) }

    it "emails a review_request" do
      expect {
        described_class.deliver(user: user, kind: "review_request", title: "Rate us")
      }.to have_enqueued_mail(CustomerMailer, :notify)
    end

    it "does NOT email a routine confirmation/reminder" do
      %w[booking_confirmed booking_reminder_day_of booking_missed booking_rescheduled loyalty_earned].each do |kind|
        expect {
          described_class.deliver(user: user, kind: kind, title: "x")
        }.not_to have_enqueued_mail(CustomerMailer, :notify)
      end
    end

    it "still sends SMS for a routine confirmation (SMS replaces email)" do
      expect {
        described_class.deliver(user: user, kind: "booking_confirmed", title: "Confirmed")
      }.to have_enqueued_job(NotificationSmsJob)
    end
  end
end
