require "rails_helper"

RSpec.describe EmailVerification, type: :model do
  it "issues a 6-digit code stored hashed (not plaintext), email normalized" do
    record, raw = described_class.issue!("  Newuser@Example.com ")
    expect(raw).to match(/\A\d{6}\z/)
    expect(record.code_digest).not_to eq(raw)
    expect(record.code_digest).to eq(Digest::SHA256.hexdigest(raw))
    expect(record.email).to eq("newuser@example.com")
  end

  it "verifies the correct code once and marks it used" do
    _record, raw = described_class.issue!("a@example.com")
    expect(described_class.verify("a@example.com", raw)).to be(true)
    # a second use fails (already verified -> not live)
    expect(described_class.verify("a@example.com", raw)).to be(false)
  end

  it "rejects a wrong code" do
    described_class.issue!("a@example.com")
    expect(described_class.verify("a@example.com", "000000")).to be(false)
  end

  it "expires a code after its TTL" do
    record, raw = described_class.issue!("a@example.com")
    record.update_columns(expires_at: 1.minute.ago)
    expect(described_class.verify("a@example.com", raw)).to be(false)
  end

  it "burns the code after too many attempts" do
    _record, raw = described_class.issue!("a@example.com")
    (described_class::MAX_ATTEMPTS + 1).times { described_class.verify("a@example.com", "111111") }
    expect(described_class.verify("a@example.com", raw)).to be(false)
  end

  it "raises TooSoon on a resend within the gap" do
    described_class.issue!("a@example.com")
    expect { described_class.issue!("a@example.com") }.to raise_error(described_class::TooSoon)
  end
end
