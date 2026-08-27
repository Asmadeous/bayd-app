require "rails_helper"

RSpec.describe WebauthnChallenge, type: :model do
  let(:user) { create(:user) }

  it "issues a challenge and supersedes any prior one for the same purpose" do
    described_class.issue!(user, "registration", "aaa")
    described_class.issue!(user, "registration", "bbb")
    expect(described_class.where(user: user, purpose: "registration").count).to eq(1)
    expect(described_class.consume!(user, "registration")).to eq("bbb")
  end

  it "consume! returns the value once then deletes it (one-time use)" do
    described_class.issue!(user, "authentication", "xyz")
    expect(described_class.consume!(user, "authentication")).to eq("xyz")
    expect(described_class.consume!(user, "authentication")).to be_nil
  end

  it "does not return an expired challenge" do
    c = described_class.issue!(user, "registration", "old")
    c.update_columns(expires_at: 1.minute.ago)
    expect(described_class.consume!(user, "registration")).to be_nil
  end
end
