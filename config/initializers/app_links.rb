# The customer app's store listings, for the "get the app" block in customer
# emails. Mirrors client/lib/app-links.ts: flip `live` once Apple / Google
# approve the app (in both places).
module AppLinks
  # Off until Apple approves the iPhone app.
  APP_STORE = { live: false, url: "https://apps.apple.com/app/id6812065322" }.freeze
  GOOGLE_PLAY = { live: true, url: "https://play.google.com/store/apps/details?id=ca.baydspa.customer" }.freeze

  def self.any_live? = APP_STORE[:live] || GOOGLE_PLAY[:live]

  # The website, which iPhone customers add to their Home Screen while the
  # App Store listing is off.
  def self.web_url = ENV.fetch("APP_URL", "http://localhost:3001")
  def self.web_host = URI(web_url).host
end
