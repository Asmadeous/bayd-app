# Simple admin-editable key/value settings store. Values are strings; typed
# accessors (e.g. group_deposit_pct) coerce as needed. Falls back to DEFAULTS
# when a key hasn't been set yet.
class Setting < ApplicationRecord
  validates :key, presence: true, uniqueness: true

  DEFAULTS = {
    "group_deposit_pct" => "25", # % of the total collected upfront for group bookings
    "group_deposit_min" => "50", # minimum group deposit in $ (floor on the % above)
    # Printed on every invoice when set. A Canadian invoice needs the GST/HST
    # registration number; blank prints nothing rather than a made-up one.
    "invoice_hst_number"       => "",
    "invoice_business_address" => ""
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

  # Minimum group-booking deposit in dollars. Returns a BigDecimal.
  def self.group_deposit_min
    get("group_deposit_min").to_d
  end
end
