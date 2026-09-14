require "rails_helper"

RSpec.describe DeviceToken, type: :model do
  let(:user) { create(:user) }

  it "requires a unique token" do
    create(:device_token, token: "abc")
    expect(build(:device_token, token: "abc")).not_to be_valid
  end

  describe ".register!" do
    it "creates a token for a user" do
      dt = described_class.register!(user: user, token: "tok-1", platform: "ios")
      expect(dt.user).to eq(user)
      expect(dt.platform_ios?).to be(true)
    end

    it "re-points an existing token to a new user (account switch on a device)" do
      described_class.register!(user: user, token: "shared", platform: "android")
      other = create(:user)
      dt = described_class.register!(user: other, token: "shared", platform: "android")
      expect(dt.user).to eq(other)
      expect(described_class.where(token: "shared").count).to eq(1)
    end
  end
end
