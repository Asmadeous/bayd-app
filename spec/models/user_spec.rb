require "rails_helper"

RSpec.describe User do
  describe "email/phone requirement" do
    it "a customer can be created with phone only (no email)" do
      user = build(:user, email: nil, phone: "+16471234567", role: :customer)
      expect(user).to be_valid
    end

    it "a customer can be created with email only (no phone)" do
      user = build(:user, email: "phoneless@example.com", phone: nil, role: :customer)
      expect(user).to be_valid
    end

    it "a customer needs at least one of email/phone" do
      user = build(:user, email: nil, phone: nil, role: :customer)
      expect(user).not_to be_valid
      expect(user.errors[:base]).to include("Email or phone is required")
    end

    it "staff/admin still require an email even with a phone" do
      user = build(:user, email: nil, phone: "+16471234567", role: :employee)
      expect(user).not_to be_valid
      expect(user.errors[:email]).to be_present
    end
  end

  describe "email uniqueness" do
    it "allows multiple customers with no email (nulls aren't unique-constrained)" do
      create(:user, email: nil, phone: "+16471111111", role: :customer)
      second = build(:user, email: nil, phone: "+16472222222", role: :customer)

      expect(second).to be_valid
    end

    it "still rejects a duplicate email" do
      create(:user, email: "dupe@example.com")
      second = build(:user, email: "dupe@example.com")

      expect(second).not_to be_valid
      expect(second.errors[:email]).to be_present
    end
  end
end
