require "rails_helper"

# The `partner` role behaves like `employee` for auth, with ONE difference: it
# is exempt from the @baydspa.ca company-domain rule (partners are external
# businesses that log in with their own email). These guard that contract.
RSpec.describe User, "partner role", type: :model do
  it "is a valid role" do
    expect(User.roles).to include("partner")
  end

  it "allows a partner to use an external (non-company) email" do
    user = User.new(role: :partner, email: "owner@glowstudio.com",
                    password: "secret123", first_name: "Glow")
    expect(user).to be_valid
  end

  it "still rejects an EMPLOYEE on a non-company email (exemption is partner-only)" do
    user = User.new(role: :employee, email: "owner@gmail.com",
                    password: "secret123", first_name: "X")
    expect(user).not_to be_valid
    expect(user.errors[:email].join).to match(/@baydspa\.ca/)
  end

  it "requires a real email for a partner (it's their login)" do
    user = User.new(role: :partner, phone: "+15550009999", first_name: "NoEmail")
    expect(user).not_to be_valid
    expect(user.errors[:email]).to be_present
  end

  it "is not a customer, so auth flows treat it as a password account" do
    user = User.new(role: :partner)
    expect(user.customer?).to be(false)
    expect(user.partner?).to be(true)
  end
end
