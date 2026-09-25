# Mac agent: build and check the iOS apps

Pull the latest `main` of github.com:Asmadeous/bayd-app (commit 44e68be or later).

Goal: build and run both iOS apps (customer and staff) and check the new
branding and launch screen.

## Rules

- Point the builds at the production API (the default,
  `https://api.baydspa.ca/api/v1`). Never localhost. Do not set
  `MOBILE_API_URL`.
- Do not edit server config or `.env` files.
- Do not commit or push unless the user says so.

## Steps (run in `client/`)

1. `npm ci`
2. Customer app: `npm run build:mobile && npx cap sync ios`, then open
   `ios/App` in Xcode and run on a real iPhone (or a simulator if no device).
3. Staff app: `npm run build:mobile:employee && CAP_APP=employee npx cap sync ios`,
   then open `ios-employee/App` and run it the same way.

## Check and report

Send screenshots or a screen recording of a cold launch.

1. App icon: white door on brand pink (`#C96C83`), for both apps.
2. Launch: the first screen should already be the loading screen (pink, white
   door, "Beauty @ Your Door", three bubbles). The bubbles should start
   bouncing with no jump, resize or blur between the iOS launch image and the
   in-app screen. If the lockup jumps or changes size at the handoff, say by
   roughly how much and on which iPhone model. Don't try to fix it yet.
3. After the splash, the customer app lands on Home and the staff app on
   Schedule (or sign-in).
4. Any build errors, with the full error text.
