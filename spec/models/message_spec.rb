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

  it "allows a photo with no text" do
    message = build(:message, conversation: convo, sender: alice, body: "")
    message.image.attach(io: file_fixture("test_avatar.png").open, filename: "photo.png")
    expect(message).to be_valid
  end

  it "rejects a photo over 10 MB" do
    message = build(:message, conversation: convo, sender: alice, body: "")
    message.image.attach(io: file_fixture("test_avatar.png").open, filename: "photo.png")
    allow(message.image.blob).to receive(:byte_size).and_return(Message::MAX_IMAGE_SIZE + 1)
    expect(message).not_to be_valid
    expect(message.errors[:image]).to be_present
  end

  it "rejects a sender who is not a participant" do
    stranger = create(:user)
    expect(build(:message, conversation: convo, sender: stranger, body: "hi")).not_to be_valid
  end

  it "masks objectionable words before saving" do
    message = convo.messages.create!(sender: alice, body: "this is shit")
    expect(message.reload.body).to eq("this is ****")
  end

  it "bumps the conversation's last_message_at on create" do
    expect { convo.messages.create!(sender: alice, body: "hi") }
      .to change { convo.reload.last_message_at }.from(nil)
  end
end
