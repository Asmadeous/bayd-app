require "rails_helper"

RSpec.describe BusinessHours do
  describe ".parse_local" do
    it "interprets a naive wall-clock string as business-local time (not UTC)" do
      t = described_class.parse_local("2026-08-20T13:00:00")
      # 1 PM Toronto (EDT, UTC-4) → 17:00 UTC.
      expect(t.utc.hour).to eq(17)
      expect(t.in_time_zone(described_class.zone).hour).to eq(13)
    end

    it "accepts a space-separated 'YYYY-MM-DD HH:MM' form (slot format)" do
      t = described_class.parse_local("2026-08-20 09:30")
      expect(t.in_time_zone(described_class.zone).strftime("%H:%M")).to eq("09:30")
    end

    it "returns nil for blank or unparseable input" do
      expect(described_class.parse_local("")).to be_nil
      expect(described_class.parse_local("not-a-time")).to be_nil
    end
  end

  describe "operating-hours semantics (regression guard)" do
    # The bug: a 1 PM local booking was stored as 13:00 UTC (= 9 AM local) and the
    # hours gate compared the UTC hour against local OPEN/CLOSE. These assert the
    # stored instant's LOCAL hour is what matters.
    it "a 1 PM local booking falls INSIDE 10:00-19:00 local hours" do
      local = described_class.parse_local("2026-08-20T13:00:00").in_time_zone(described_class.zone)
      expect(local.hour).to be_between(described_class::OPEN_HOUR, described_class::CLOSE_HOUR - 1)
    end

    it "a 1 AM local booking falls OUTSIDE business hours" do
      local = described_class.parse_local("2026-08-20T01:00:00").in_time_zone(described_class.zone)
      expect(local.hour).to be < described_class::OPEN_HOUR
    end
  end
end
