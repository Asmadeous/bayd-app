require "active_support/core_ext/integer/time"

Rails.application.configure do
  # Settings specified here will take precedence over those in config/application.rb.

  # Code is not reloaded between requests.
  config.enable_reloading = false

  # Eager load code on boot for better performance and memory savings (ignored by Rake tasks).
  config.eager_load = true

  # Full error reports are disabled.
  config.consider_all_requests_local = false

  # Cache assets for far-future expiry since they are all digest stamped.
  config.public_file_server.headers = { "cache-control" => "public, max-age=#{1.year.to_i}" }

  # Enable serving of images, stylesheets, and JavaScripts from an asset server.
  # config.asset_host = "http://assets.example.com"

  # Access is via a SSL-terminating reverse proxy (Kamal proxy / Thruster).
  config.assume_ssl = true

  # Force SSL, enable HSTS, and use secure cookies — but never redirect the
  # health check (the proxy hits it over http).
  config.force_ssl = true
  config.ssl_options = { redirect: { exclude: ->(request) { request.path == "/up" } } }

  # Log to STDOUT with the current request id as a default log tag.
  config.log_tags = [ :request_id ]
  config.logger   = ActiveSupport::TaggedLogging.logger(STDOUT)

  # Change to "debug" to log everything (including potentially personally-identifiable information!).
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")

  # Prevent health checks from clogging up the logs.
  config.silence_healthcheck_path = "/up"

  # Don't log any deprecations.
  config.active_support.report_deprecations = false

  # Replace the default in-process memory cache store with a durable alternative.
  config.cache_store = :solid_cache_store

  # Replace the default in-process and non-durable queuing backend for Active Job.
  config.active_job.queue_adapter = :solid_queue
  config.solid_queue.connects_to = { database: { writing: :queue } }

  # Enable locale fallbacks for I18n (makes lookups for any locale fall back to
  # the I18n.default_locale when a translation cannot be found).
  config.i18n.fallbacks = true

  # Do not dump schema after migrations.
  config.active_record.dump_schema_after_migration = false

  # Only use :id for inspections in production.
  config.active_record.attributes_for_inspect = [ :id ]

  # Host header allow-list (DNS-rebinding protection). Restricts to APP_HOST when
  # set; left open otherwise so first boot / IP access isn't locked out. The
  # health check is always exempt so the proxy can reach it.
  if (app_host = ENV["APP_HOST"]).present?
    config.hosts << app_host
    config.hosts << "www.#{app_host}"
    config.host_authorization = { exclude: ->(request) { request.path == "/up" } }
  end

  # Condensed, structured (JSON) request logs — one line per request.
  config.lograge.enabled = true
  config.lograge.formatter = Lograge::Formatters::Json.new
  config.lograge.custom_options = ->(event) { { request_id: event.payload[:request_id] }.compact }

  # Active Storage — local disk (files in storage/; ensure the path persists).
  config.active_storage.service = :local

  # Mailer — SMTP via ENV. Delivery failures are logged, not raised, so a
  # transient mail outage never breaks the request/job that triggered it.
  config.action_mailer.delivery_method = :smtp
  config.action_mailer.raise_delivery_errors = false
  config.action_mailer.perform_deliveries = ENV["SMTP_ADDRESS"].present?
  config.action_mailer.default_url_options = {
    host: ENV.fetch("APP_HOST", "baydspa.ca"),
    protocol: "https"
  }
  config.action_mailer.smtp_settings = {
    address:        ENV["SMTP_ADDRESS"],
    port:           ENV.fetch("SMTP_PORT", 587).to_i,
    user_name:      ENV["SMTP_USERNAME"],
    password:       ENV["SMTP_PASSWORD"],
    authentication: :plain,
    enable_starttls_auto: true
  }
end
