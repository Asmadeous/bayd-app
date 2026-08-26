# Global request timeout: abort a request that hangs on a slow upstream (payment
# gateway, geocoder) so it can't pin a Puma thread forever. The
# middleware is inserted by rack-timeout's railtie and reads
# RACK_TIMEOUT_SERVICE_TIMEOUT at boot; we map our friendlier env name onto it
# and default to 15s. rack-timeout is a no-op in the test environment.
ENV["RACK_TIMEOUT_SERVICE_TIMEOUT"] ||= ENV.fetch("REQUEST_TIMEOUT_SECONDS", "15")
