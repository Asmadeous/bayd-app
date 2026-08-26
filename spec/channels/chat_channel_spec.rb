require "rails_helper"

RSpec.describe ChatChannel, type: :channel do
  let(:alice) { create(:user) }
  let(:bob)   { create(:user) }
  let(:convo) { Conversation.between(alice, bob) }

  it "subscribes a participant and streams the conversation" do
    stub_connection current_user: alice
    subscribe(conversation_id: convo.id)
    expect(subscription).to be_confirmed
    expect(subscription).to have_stream_from("conversation:#{convo.id}")
  end

  it "rejects a non-participant" do
    stub_connection current_user: create(:user)
    subscribe(conversation_id: convo.id)
    expect(subscription).to be_rejected
  end

  it "broadcasts a new message to the conversation stream" do
    message = convo.messages.create!(sender: alice, body: "live!")
    expect {
      described_class.broadcast_message(message)
    }.to have_broadcasted_to("conversation:#{convo.id}").with(hash_including(body: "live!"))
  end
end
