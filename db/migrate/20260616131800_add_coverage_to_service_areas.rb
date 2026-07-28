class AddCoverageToServiceAreas < ActiveRecord::Migration[8.1]
  def change
    # Admin-controlled bookable boundary: a circular zone (centre + radius).
    # Consistent with the decimal lat/lng convention used elsewhere
    # (employee_profiles.base_*), but queried via indexed PostGIS ST_DWithin.
    change_table :service_areas, bulk: true do |t|
      t.decimal :center_latitude,  precision: 10, scale: 6
      t.decimal :center_longitude, precision: 10, scale: 6
      t.integer :radius_meters
    end

    reversible do |dir|
      dir.up do
        execute <<~SQL
          CREATE INDEX index_service_areas_on_center
            ON service_areas
            USING gist (CAST(ST_SetSRID(ST_MakePoint(center_longitude, center_latitude), 4326) AS geography))
            WHERE center_latitude IS NOT NULL AND center_longitude IS NOT NULL;
        SQL
      end
      dir.down do
        execute "DROP INDEX IF EXISTS index_service_areas_on_center;"
      end
    end
  end
end
