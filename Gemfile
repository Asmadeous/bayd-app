source "https://rubygems.org"

gem "rails", "~> 8.1.3"
gem "pg", "~> 1.1"
gem "puma", ">= 5.0"

# Password hashing
gem "bcrypt", "~> 3.1.7"

# Auth
gem "devise"
gem "devise-jwt"
# Passkeys / WebAuthn (optional MFA) — server-side relying-party crypto
gem "webauthn", "~> 3.0"

# PostGIS spatial queries
gem "activerecord-postgis-adapter"
gem "rgeo-geojson"

# HTTP clients (Traccar wrapper, FCM push)
gem "faraday"
gem "faraday-retry"
# OAuth2 access tokens for FCM HTTP v1 (service-account auth)
gem "googleauth"

# Serialization
gem "blueprinter"

# Pagination
gem "pagy"

# Background jobs
gem "sidekiq"
gem "sidekiq-cron"

# Rate limiting
gem "rack-attack"

# CORS
gem "rack-cors"

# Monitoring & resilience
gem "sentry-ruby"     # error tracking
gem "sentry-rails"    # Rails integration for Sentry
gem "rack-timeout"    # abort requests that hang on a slow upstream
gem "lograge"         # condensed, structured (JSON) request logs

# Env vars
gem "dotenv-rails"

# Geocoding (address → lat/lng)
gem "geocoder"

# Windows does not include zoneinfo files
gem "tzinfo-data", platforms: %i[windows jruby]

# DB-backed cache, queue, and websockets (ActionCable) — Postgres, no Redis
gem "solid_cable"
gem "solid_cache"
gem "solid_queue"

# Boot time caching
gem "bootsnap", require: false

# Deployment
gem "kamal", require: false
gem "thruster", require: false

group :development, :test do
  gem "debug", platforms: %i[mri windows], require: "debug/prelude"
  gem "rspec-rails"
  gem "factory_bot_rails"
  gem "bundler-audit", require: false
  gem "brakeman", require: false
  gem "rubocop-rails-omakase", require: false
end

group :test do
  gem "shoulda-matchers"
end

gem "prawn", "~> 2.4"
gem "prawn-table", "~> 0.2.2"

gem "matrix", "~> 0.4.3"
