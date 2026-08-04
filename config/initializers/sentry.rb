# Error tracking. Only activates for a real DSN URL — a blank, commented, or
# otherwise malformed value stays disabled (dev/test quiet) instead of crashing
# Sentry's URI parser at boot.
sentry_dsn = ENV["SENTRY_DSN"].to_s.strip
if sentry_dsn.match?(%r{\Ahttps?://})
  Sentry.init do |config|
    config.dsn = sentry_dsn
    config.breadcrumbs_logger = %i[active_support_logger http_logger]
    config.environment = ENV.fetch("SENTRY_ENVIRONMENT", Rails.env)
    config.release = ENV["SENTRY_RELEASE"] if ENV["SENTRY_RELEASE"].present?

    # Performance tracing — sampled to control cost (0 disables it).
    config.traces_sample_rate = ENV.fetch("SENTRY_TRACES_SAMPLE_RATE", "0.1").to_f

    # Never attach PII (client IPs, cookies, request bodies). Rails'
    # filter_parameters still scrubs anything that does get captured.
    config.send_default_pii = false

    # Only report genuinely unhandled errors — 404s / validation 422s are
    # rescued in ApplicationController and are not incidents.
    config.rails.report_rescued_exceptions = false
  end
end
