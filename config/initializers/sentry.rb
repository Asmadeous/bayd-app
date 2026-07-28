# Error tracking. Only activates when SENTRY_DSN is set, so dev/test stay quiet.
if ENV["SENTRY_DSN"].present?
  Sentry.init do |config|
    config.dsn = ENV["SENTRY_DSN"]
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
