# Shared period→start-time mapping used by the analytics endpoints.
module AnalyticsPeriod
  RANGES = {
    "7d"  => -> { 7.days.ago },
    "30d" => -> { 30.days.ago },
    "90d" => -> { 90.days.ago },
    "ytd" => -> { Time.current.beginning_of_year },
    "all" => -> { nil }
  }.freeze

  DEFAULT = "30d"

  def self.normalize(key)
    RANGES.key?(key) ? key : DEFAULT
  end

  def self.start_for(key)
    RANGES.fetch(normalize(key)).call
  end
end
