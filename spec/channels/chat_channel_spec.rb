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

  it "relays a typing signal to the conversation stream" do
    stub_connection current_user: alice
    subscribe(conversation_id: convo.id)

    expect { perform :typing }
      .to have_broadcasted_to("conversation:#{convo.id}")
      .with(hash_including(type: "typing", user_id: alice.id, typing: true))
  end

  it "relays a stopped_typing signal" do
    stub_connection current_user: alice
    subscribe(conversation_id: convo.id)

    expect { perform :stopped_typing }
      .to have_broadcasted_to("conversation:#{convo.id}")
      .with(hash_including(type: "typing", typing: false))
  end

  it "broadcasts a read receipt with a type" do
    at = Time.current
    expect {
      described_class.broadcast_read(convo, alice, at)
    }.to have_broadcasted_to("conversation:#{convo.id}")
      .with(hash_including(type: "read", reader_id: alice.id))
  end

  describe "presence" do
    around do |example|
      original = Rails.cache
      Rails.cache = ActiveSupport::Cache::MemoryStore.new
      example.run
    ensure
      Rails.cache = original
    end

    it "broadcasts online to the user's conversations on first subscribe" do
      convo # ensure the conversation exists
      stub_connection current_user: alice

      expect {
        subscribe(conversation_id: convo.id)
      }.to have_broadcasted_to("conversation:#{convo.id}")
        .with(hash_including(type: "presence", user_id: alice.id, online: true))
      expect(Presence.online?(alice.id)).to be(true)
    end
  end
end
