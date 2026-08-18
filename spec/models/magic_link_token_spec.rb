require "rails_helper"

RSpec.describe MagicLinkToken do
  let(:user) { create(:user) }

  describe ".issue! / .find_usable" do
    it "returns a raw token that resolves back to the same row" do
      raw = described_class.issue!(user)

      found = described_class.find_usable(raw)
      expect(found.user).to eq(user)
    end

    it "never stores the raw token itself" do
      raw = described_class.issue!(user)

      expect(described_class.last.token_digest).not_to eq(raw)
    end

    it "returns nil for a token that was never issued" do
      expect(described_class.find_usable("not-a-real-token")).to be_nil
    end

    it "returns nil for a blank token" do
      expect(described_class.find_usable("")).to be_nil
      expect(described_class.find_usable(nil)).to be_nil
    end

    it "returns nil once the token has expired" do
      raw = described_class.issue!(user)
      described_class.last.update!(expires_at: 1.minute.ago)

      expect(described_class.find_usable(raw)).to be_nil
    end
  end

  describe "#consume!" do
    it "marks the token used so it can't be found as usable again" do
      raw = described_class.issue!(user)
      token = described_class.find_usable(raw)

      token.consume!

      expect(described_class.find_usable(raw)).to be_nil
    end
  end
end
