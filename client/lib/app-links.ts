// The customer app's store listings. Nothing on the website or in emails points
// to a store until its listing is live: flip `live` once Apple / Google approve
// the app, and flip the matching flag in the API (config/initializers/app_links.rb)
// so emails link to it too.
export const APP_STORE = {
  live: true,
  appId: "6812065322",
  url: "https://apps.apple.com/app/id6812065322",
}

export const GOOGLE_PLAY = {
  live: true,
  url: "https://play.google.com/store/apps/details?id=ca.baydspa.customer",
}

export const anyAppLive = APP_STORE.live || GOOGLE_PLAY.live
