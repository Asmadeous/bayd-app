Geocoder.configure(
  lookup:  :google,
  api_key: ENV.fetch("GOOGLE_MAPS_API_KEY", nil),
  units:   :km,
  timeout: 5
)
