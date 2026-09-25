require "rails_helper"

RSpec.describe ChatMessagePushJob, type: :job do
  let(:customer) { create(:user, first_name: "Ada") }
  let(:tech)     { create(:user, first_name: "Susi", email: "susi-push@baydspa.ca", role: :employee) }
  let(:convo)    { Conversation.between(customer, tech) }

  it "pushes the message to the other participant with the thread to open" do
    message = convo.messages.create!(sender: customer, body: "Running 5 minutes late")

    expect(PushService).to receive(:push).with(
      user: tech,
      title: "New message from Ada",
      body: "Running 5 minutes late",
      data: { kind: "chat_message", conversation_id: convo.id, path: "/staff/messages/thread?id=#{convo.id}" }
    )
    described_class.perform_now(message.id)
  end

  it "sends a customer to the customer app's thread" do
    message = convo.messages.create!(sender: tech, body: "On my way")

    expect(PushService).to receive(:push).with(hash_including(user: customer, data: hash_including(path: "/app/messages/thread?id=#{convo.id}")))
    described_class.perform_now(message.id)
  end
end
