# Shared great-circle distance helper. Kept dependency-free so any service
# (dispatch, mileage) can compute km between two lat/lng pairs the same way.
module Geo
  EARTH_RADIUS_KM = 6371.0

  module_function

  # Haversine distance in km. Returns Float::INFINITY if any coordinate is nil,
  # so callers can treat unreachable/unknown legs as "skip".
  def haversine_km(lat1, lng1, lat2, lng2)
    return Float::INFINITY if lat1.nil? || lng1.nil? || lat2.nil? || lng2.nil?

    dlat = (lat2.to_f - lat1.to_f) * Math::PI / 180
    dlng = (lng2.to_f - lng1.to_f) * Math::PI / 180
    a = (Math.sin(dlat / 2)**2) +
        (Math.cos(lat1.to_f * Math::PI / 180) *
         Math.cos(lat2.to_f * Math::PI / 180) *
         (Math.sin(dlng / 2)**2))
    EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  end
end
