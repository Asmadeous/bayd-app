require "rails_helper"

RSpec.describe Message, type: :model do
  let(:alice) { create(:user) }
  let(:bob)   { create(:user) }
  let(:convo) { Conversation.between(alice, bob) }

  it "is valid when a participant sends a non-empty body" do
    expect(build(:message, conversation: convo, sender: alice, body: "hi")).to be_valid
  end

  it "requires a body" do
    expect(build(:message, conversation: convo, sender: alice, body: "")).not_to be_valid
  end

  it "rejects a sender who is not a participant" do
    stranger = create(:user)
    expect(build(:message, conversation: convo, sender: stranger, body: "hi")).not_to be_valid
  end

  it "bumps the conversation's last_message_at on create" do
    expect { convo.messages.create!(sender: alice, body: "hi") }
      .to change { convo.reload.last_message_at }.from(nil)
  end
end
