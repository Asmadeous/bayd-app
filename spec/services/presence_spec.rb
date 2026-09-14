require "rails_helper"

RSpec.describe Presence, type: :service do
  # The test env uses :null_store (nothing persists), so give Presence a real
  # in-memory cache for these assertions.
  around do |example|
    original = Rails.cache
    Rails.cache = ActiveSupport::Cache::MemoryStore.new
    example.run
  ensure
    Rails.cache = original
  end

  it "marks a user online on the first connection (0 -> 1 transition)" do
    expect(described_class.online?(1)).to be(false)
    expect(described_class.connect(1)).to be(true)   # transition
    expect(described_class.online?(1)).to be(true)
  end

  it "ref-counts multiple connections; only the first is a transition" do
    expect(described_class.connect(1)).to be(true)
    expect(described_class.connect(1)).to be(false)  # second tab, no transition
    expect(described_class.online?(1)).to be(true)
  end

  it "goes offline only when the last connection closes" do
    described_class.connect(1)
    described_class.connect(1)
    expect(described_class.disconnect(1)).to be(false) # still one open
    expect(described_class.online?(1)).to be(true)
    expect(described_class.disconnect(1)).to be(true)  # last one -> offline
    expect(described_class.online?(1)).to be(false)
  end
end
