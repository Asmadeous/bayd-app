require "rails_helper"

RSpec.describe Conversation, type: :model do
  let(:alice) { create(:user) }
  let(:bob)   { create(:user) }

  describe ".between" do
    it "creates one conversation for a pair regardless of order" do
      c1 = described_class.between(alice, bob)
      c2 = described_class.between(bob, alice)
      expect(c1).to eq(c2)
      expect(described_class.count).to eq(1)
    end

    it "normalizes so participant_one is the lower id" do
      c = described_class.between(bob, alice)
      lower, higher = [ alice, bob ].minmax_by(&:id)
      expect(c.participant_one).to eq(lower)
      expect(c.participant_two).to eq(higher)
    end
  end

  it "rejects a conversation with the same user twice" do
    c = described_class.new(participant_one: alice, participant_two: alice)
    expect(c).not_to be_valid
  end

  describe "#participant? / #other_participant" do
    let(:convo) { described_class.between(alice, bob) }

    it "knows its participants" do
      expect(convo.participant?(alice)).to be(true)
      expect(convo.participant?(create(:user))).to be(false)
    end

    it "returns the other participant" do
      expect(convo.other_participant(alice)).to eq(bob)
      expect(convo.other_participant(bob)).to eq(alice)
    end
  end

  describe "#unread_count_for" do
    let(:convo) { described_class.between(alice, bob) }

    it "counts unread messages the other person sent" do
      convo.messages.create!(sender: bob, body: "hi")
      convo.messages.create!(sender: bob, body: "you there?")
      convo.messages.create!(sender: alice, body: "yes") # alice's own don't count
      expect(convo.unread_count_for(alice)).to eq(2)
    end
  end

  describe "#mark_read_by!" do
    let(:convo) { described_class.between(alice, bob) }

    it "marks only the other person's unread messages read" do
      convo.messages.create!(sender: bob, body: "one")
      convo.messages.create!(sender: bob, body: "two")
      own = convo.messages.create!(sender: alice, body: "mine")

      count = convo.mark_read_by!(alice)
      expect(count).to eq(2)
      expect(convo.unread_count_for(alice)).to eq(0)
      expect(own.reload.read_at).to be_nil # own message isn't a "read" target
    end

    it "returns 0 when there is nothing unread" do
      expect(convo.mark_read_by!(alice)).to eq(0)
    end
  end
end
