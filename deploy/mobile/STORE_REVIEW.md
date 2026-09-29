# Store review notes

Copy-paste material for submitting the apps. Only the **customer app (BAYD)**
goes to App Store / Google Play review; the **staff app (BAYD Staff)** is
distributed through TestFlight and Play internal testing for now (see "Long-term
iOS distribution for the staff app" at the end).

## Links for the store listings

- Privacy policy: https://baydspa.ca/privacy
- Terms of service: https://baydspa.ca/terms
- Account deletion (Google Play "delete account" URL): https://baydspa.ca/delete-account
- Support / contact: Bookings@baydspa.ca

## Customer app: before you submit or reply to App Review

Apple rejected build 1.0.25 (25) under guideline 2.1 "Information Needed"
because this is a new developer account. They want a screen recording and six
answers, sent as a reply AND pasted into App Review Information > Notes. Do
these first, or the reviewer hits a dead end and rejects again:

- [ ] `APP_REVIEW_DEMO_EMAIL` and `APP_REVIEW_DEMO_CODE` are set as GitHub
      secrets and deployed. Sign in with them on a real iPhone to prove it.
- [ ] The demo account has a first name, a phone number, a saved Toronto
      address, and **one completed past booking with a technician**. Chat only
      opens between a customer and a tech who share a booking, so without it
      the reviewer cannot reach chat, Report, Block or "Rate your service".
- [ ] Tell the team that bookings from the demo account are App Review tests:
      they dispatch to real technicians like any booking. Nobody travels; an
      admin cancels them.
- [ ] https://baydspa.ca/privacy, /terms and /delete-account load, and the
      Terms show the "Messages, photos and reviews" section (deploy first).
- [ ] Someone checks chat reports (in-app admin alert + email) at least daily.
      The Terms promise a review within 24 hours, and so does guideline 1.2.
- [ ] Screenshots: replace `01-welcome.png`. It is the sign-in landing screen,
      and guideline 2.3.3 says screenshots must show the app in use, not the
      login or splash screen. Use the booking flow or the technician tracking
      screen instead.
- [ ] App Store Connect: Privacy Policy URL and Support URL set; the age
      rating questionnaire answers "yes" to user-generated content and
      messaging; App Privacy matches the table below.
- [ ] Record the screen recording below, then reply with the text below.

### Screen recording (physical iPhone, latest iOS)

Update the iPhone to the latest iOS first. Record with Control Center > Screen
Recording, and use a throwaway account of your own (not the demo account) so
you can delete it at the end. Aim for 3 to 5 minutes, in this order:

1. Start on the Home Screen and tap the BAYD icon (the launch must be in it).
2. **Registration:** Create an account > first name, email, phone > enter the
   texted code > you land in the app.
3. **Login:** Profile > Sign out, then "I already have an account" > Email >
   Continue > enter the emailed code.
4. **Booking:** Bookings > Book now > service > technician > time > address >
   "Book now, pay after the visit". Then start a second booking and tap
   "Pay now" to show Square's checkout page opening (stop before entering a
   card). This covers "paid features".
5. **Shop:** Shop > a product > cart > checkout page (stop before paying).
6. **User-generated content:** Chat > open a technician conversation > send a
   message > three-dot menu > Report (pick a reason, send) > three-dot menu >
   Block, then Unblock. Then a past booking > Rate your service.
7. **Account deletion:** Profile > Privacy policy (show it opens) > back >
   Delete account > type DELETE > confirm > you are back on the welcome
   screen.

Attach the video to the reply in App Review, and also to App Review
Information > Attachment.

### Reply to App Review and Notes field

Fill in the bracketed parts and paste the same text into both the reply and
App Review Information > Notes (it stays under Apple's 4,000-character limit).
Put the demo email and code in the Sign-In Information fields too. Never commit
the real values to this file.

```text
Hello, thank you for reviewing BAYD. The requested information is below, and a screen recording from a physical iPhone ([model], iOS [version]) is attached. It starts at launch and shows registration, login, booking, payment, chat with Report and Block, a review, and account deletion.

1. SCREEN RECORDING
Attached.

2. PURPOSE AND AUDIENCE
BAYD (Beauty @ Your Door) is the customer app for our mobile beauty business in the Greater Toronto Area, Canada. Adults book at-home nail, lash, waxing, massage and spa services, and a technician travels to their address. It saves a trip to a salon and helps people with busy schedules, young children or limited mobility. Customers book and manage appointments, message their technician, see the technician's arrival on the day, buy beauty products and gift cards, and keep receipts. This app is for the public; our technicians use a separate staff app that is not part of this submission.

3. HOW TO ACCESS THE APP
Sign-in is passwordless (a one-time code). The demo account accepts a fixed code, so no email access is needed.
- Tap "I already have an account", keep Email, enter [DEMO EMAIL], tap Continue, enter code [DEMO CODE].
- Bookings tab: upcoming and past appointments (List or Calendar). Tap Book now, choose a service, technician and time, use the saved address, and tap "Book now, pay after the visit" to finish without paying.
- Chat tab: open the technician conversation. The three-dot menu at the top right has Report and Block.
- Past booking: "Rate your service". Reviews are published only after our team checks them.
- Shop tab: physical beauty products and gift cards.
- Profile tab: Privacy policy, Terms, and Delete account (type DELETE to confirm). After deleting, signing in again with the demo email and code creates a new empty account.
An account is needed because each booking sends a technician to the customer's home, so we need a verified phone number and address; bookings, orders, messages and receipts belong to that account.

4. EXTERNAL SERVICES
- Square (and Helcim on our website): card payments on a hosted checkout page
- Google Maps Platform: address lookup and travel time
- OpenStreetMap: map tiles for the technician's arrival map
- Apple Push Notification service via Firebase Cloud Messaging: notifications
- Infobip: SMS verification codes and appointment texts
- [EMAIL PROVIDER]: sign-in codes and booking emails
- Jitsi Meet: optional video consultation with the technician (not recorded)
- Sentry: server error reports
- Face ID and passkeys: optional app lock and sign-in, on device
Our own backend (api.baydspa.ca) handles accounts, bookings and chat. No advertising, tracking or AI services.

PAYMENTS: every purchase is an in-person service at the customer's home, a tip for the technician, a physical product, or a gift card usable only for those, so we use Square under guideline 3.1.3(e). Nothing digital is sold. "Subscriptions" in the app are recurring appointment schedules, not digital subscriptions.

USER CONTENT: chat is between a customer and their own technician or our team. Offensive language is filtered, every chat has Report and Block, our team reviews reports within 24 hours, and the Terms have a zero-tolerance policy that users accept at sign-up.

5. REGIONAL DIFFERENCES
The app works the same in every region. Services are delivered in the Greater Toronto Area; for an address outside it, the app says so and our team follows up by phone. Prices are in Canadian dollars.

6. REGULATED INDUSTRY
BAYD offers personal beauty and relaxation services. It is not a medical, financial, gambling or other highly regulated service, and it uses no protected third-party material. Massage is relaxation spa massage, not registered massage therapy.

Contact: Bookings@baydspa.ca
```

## Customer app: App Privacy / Google Play Data safety

Data collected (all linked to the user, none used for tracking, none sold):

| Data | Purpose | Shared with |
|---|---|---|
| Name, email, phone | Account, bookings, messages | Assigned technician; Infobip (SMS); email provider |
| Address (service address) | Delivering the service | Assigned technician; Google (address lookup) |
| Precise location (optional, while using) | Technician ETA on appointment day | Not shared |
| Payment info | Payments | Square, Helcim (card numbers never reach BAYD) |
| Purchase history | Bookings, receipts, invoices | Not shared |
| Messages / in-app chat | Support and booking coordination | Assigned technician / BAYD staff |
| Photos (optional profile photo) | Profile | Not shared |
| Device ID (push token) | Notifications | Firebase Cloud Messaging |
| Crash / diagnostics | Fixing errors | Sentry |
| Audio / video (optional video call, not recorded) | Consultations | Jitsi |

- Data is encrypted in transit: yes.
- Users can request deletion: yes, in the app (Profile > Delete account), on
  the website, or by email. Booking, payment and invoice records are kept
  without personal details for tax purposes.

## Staff app (TestFlight / Play internal)

- The app shows a location explanation before first use (when, why, who sees
  it) and only shares location while the tech is on shift.
- iOS uses background location (`UIBackgroundModes: location`) so a tech's
  live position keeps updating to their client while the phone is locked. If
  external TestFlight testing is used, give Beta App Review this reason and a
  staff demo login.
- Android requests foreground location only; no background-location
  declaration is needed.
- TestFlight builds expire after 90 days: upload a new staff build before then.

### Long-term iOS distribution for the staff app

TestFlight is for beta testing, not for running the business on: builds expire
after 90 days, and more than 100 testers means external testing, which needs
Beta App Review. Apple's options for an employee-only app are:

- **Unlisted app distribution (recommended):** a normal App Store app that
  only opens from a direct link and never shows in search, charts or
  categories. Apple names "employee resources" and "franchisees" as good fits.
  It still goes through App Review, so it needs a staff demo login and the
  background-location reason above. Submit the staff app for review with
  "Requesting unlisted distribution" in the Notes, then send the request at
  https://developer.apple.com/support/unlisted-app-distribution/.
- **Custom app through Apple Business Manager:** only if BAYD manages its
  techs' phones through Apple Business Manager.

Don't submit the staff app to the public App Store. It is only useful to BAYD
employees, and guideline 3.2 sends apps like that to the options above.
