class AddPostalCodesToServiceAreas < ActiveRecord::Migration[8.1]
  def change
    # Full 6-char Canadian postal codes (normalized, no spaces) this zone serves.
    # Coverage + staff eligibility are matched against this list.
    add_column :service_areas, :postal_codes, :text, array: true, default: [], null: false
    add_index  :service_areas, :postal_codes, using: :gin
  end
end
