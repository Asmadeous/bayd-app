# Simple admin-editable key/value settings store. Values are strings; typed
# accessors (e.g. group_deposit_pct) coerce as needed. Falls back to DEFAULTS
# when a key hasn't been set yet.
class Setting < ApplicationRecord
  validates :key, presence: true, uniqueness: true

  DEFAULTS = {
    "group_deposit_pct" => "25" # % of the total collected upfront for group bookings
  }.freeze

  def self.get(key)
    find_by(key: key)&.value.presence || DEFAULTS[key]
  end

  def self.set(key, value)
    find_or_initialize_by(key: key).update!(value: value.to_s)
  end

  # Group-booking deposit percentage, admin-configurable. Returns a BigDecimal.
  def self.group_deposit_pct
    get("group_deposit_pct").to_d
  end
end
