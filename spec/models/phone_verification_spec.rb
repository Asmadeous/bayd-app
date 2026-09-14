require "rails_helper"

RSpec.describe PhoneVerification, type: :model do
  it "issues a 6-digit code stored hashed (not plaintext)" do
    record, raw = described_class.issue!("+1 416 555 0100")
    expect(raw).to match(/\A\d{6}\z/)
    expect(record.code_digest).not_to eq(raw)
    expect(record.code_digest).to eq(Digest::SHA256.hexdigest(raw))
    expect(record.phone).to eq("+14165550100") # normalized
  end

  it "verifies the correct code once and marks it used" do
    _record, raw = described_class.issue!("4165550100")
    expect(described_class.verify("4165550100", raw)).to be(true)
    # a second use fails (already verified -> not live)
    expect(described_class.verify("4165550100", raw)).to be(false)
  end

  it "rejects a wrong code" do
    described_class.issue!("4165550100")
    expect(described_class.verify("4165550100", "000000")).to be(false)
  end

  it "expires a code after its TTL" do
    record, raw = described_class.issue!("4165550100")
    record.update_columns(expires_at: 1.minute.ago)
    expect(described_class.verify("4165550100", raw)).to be(false)
  end

  it "burns the code after too many attempts" do
    _record, raw = described_class.issue!("4165550100")
    (described_class::MAX_ATTEMPTS + 1).times { described_class.verify("4165550100", "111111") }
    # even the correct code no longer works
    expect(described_class.verify("4165550100", raw)).to be(false)
  end

  it "rate-limits resends within the gap" do
    described_class.issue!("4165550100")
    expect { described_class.issue!("4165550100") }.to raise_error(described_class::TooSoon)
  end
end
