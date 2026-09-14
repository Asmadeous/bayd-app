Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # Web dev origins + the Capacitor app origins (the native webview sends
    # Origin: http(s)://localhost / capacitor://localhost). Keeps the app able to
    # call the API in local testing without extra env config.
    # Web dev + the Capacitor apps. Each mobile app now serves its WebView from a
    # real per-app hostname (capacitor.config.ts server.hostname), so those
    # origins must be allowed too. Legacy localhost origins kept for older builds.
    # NOTE: iOS Capacitor serves the WebView from the `capacitor://` scheme, while
    # Android uses `https://`. Both per-app hostnames must be allowed or the iOS
    # app's API calls are CORS-blocked (login etc. silently fail).
    default_origins = "http://localhost:3000,http://localhost:3003," \
                      "http://localhost,https://localhost,capacitor://localhost,ionic://localhost," \
                      "https://m-customer.baydspa.ca,https://m-staff.baydspa.ca,https://m-admin.baydspa.ca," \
                      "capacitor://m-customer.baydspa.ca,capacitor://m-staff.baydspa.ca,capacitor://m-admin.baydspa.ca"
    origins ENV.fetch("ALLOWED_ORIGINS", default_origins).split(",").map(&:strip)
    resource "*",
             headers: :any,
             methods: %i[get post put patch delete options head],
             expose:  %w[Authorization],
             max_age: 600
  end
end
