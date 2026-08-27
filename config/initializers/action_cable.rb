# ActionCable runs its OWN cross-origin check on the WebSocket handshake, separate
# from rack-cors. Without this, a browser on a DIFFERENT origin than the API (the
# web dashboard on baydspa.ca hitting api.baydspa.ca) has its /cable connection
# rejected and chat/live-tracking silently never connect.
#
# Use the SAME ALLOWED_ORIGINS env as CORS (one source of truth), plus the
# Capacitor app origins (the native webview presents these scheme://host origins,
# not an http site).
cors_origins = ENV.fetch("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3003").split(",").map(&:strip)

# Capacitor's webview origin differs by platform/config: capacitor:// on iOS,
# http://localhost on Android, and ionic:// on older setups. Allow them so the
# mobile apps connect too.
capacitor_origins = %w[
  capacitor://localhost
  http://localhost
  ionic://localhost
]

Rails.application.config.action_cable.allowed_request_origins = (cors_origins + capacitor_origins).uniq
