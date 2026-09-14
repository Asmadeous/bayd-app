# Passkeys / WebAuthn relying-party config. allowed_origins must include every
# origin a passkey ceremony can come from: the web dashboard + the Capacitor apps.
# Reuses the same origins as CORS/ActionCable so there's one source of truth.
WebAuthn.configure do |config|
  cors_origins = ENV.fetch(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3003,http://localhost,https://localhost,capacitor://localhost,ionic://localhost"
  ).split(",").map(&:strip)

  config.allowed_origins = cors_origins
  config.rp_name = "B.A.Y.D"
  # rp_id is derived from the origin by default; set explicitly in prod if needed
  # via ENV to pin it to the registrable domain (e.g. "baydspa.ca").
  config.rp_id = ENV["WEBAUTHN_RP_ID"].presence
end
