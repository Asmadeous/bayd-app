# Store review notes

Copy-paste material for submitting the apps. Only the **customer app (BAYD)**
goes to App Store / Google Play review; the **staff app (BAYD Staff)** is
distributed through TestFlight and Play internal testing.

## Links for the store listings

- Privacy policy: https://baydspa.ca/privacy
- Terms of service: https://baydspa.ca/terms
- Account deletion (Google Play "delete account" URL): https://baydspa.ca/delete-account
- Support / contact: Bookings@baydspa.ca

## Customer app: App Review notes (App Store Connect > App Review Information)

Sign-in is passwordless: the app emails a 6-digit code. For review, sign in
with the demo account below; it always accepts the demo code, so no email
access is needed.

- Demo email: the value of `APP_REVIEW_DEMO_EMAIL`
- Demo code: the value of `APP_REVIEW_DEMO_CODE`

(Both are production environment variables. Paste the real values into App
Store Connect, not into this file.)

Notes to include:

> BAYD books at-home beauty services (nails, lashes, waxing, massage) in the
> Greater Toronto Area. A technician travels to the customer's address.
> Payments are for in-person services and physical products, processed by
> Square and Helcim, so in-app purchase does not apply (guideline 3.1.3(e)).
> Sign in: tap "I already have an account", enter the demo email, then the demo
> code. Account deletion: Profile tab > Delete account.
> Location is optional and used only to show the technician's distance on the
> day of an appointment.

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
