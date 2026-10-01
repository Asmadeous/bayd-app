# The customer app's store listings, for the "get the app" block in customer
# emails. Mirrors client/lib/app-links.ts: flip `live` once Apple / Google
# approve the app (in both places).
module AppLinks
  APP_STORE = { live: true, url: "https://apps.apple.com/app/id6812065322" }.freeze
  GOOGLE_PLAY = { live: true, url: "https://play.google.com/store/apps/details?id=ca.baydspa.customer" }.freeze

  def self.any_live? = APP_STORE[:live] || GOOGLE_PLAY[:live]
end
