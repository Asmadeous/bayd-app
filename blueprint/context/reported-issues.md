# Reported issues backlog

> Device-testing feedback (iPhone 17 Pro simulator, customer + staff apps) and
> follow-up requests. These are NOT the active feature (see `current-feature.md`,
> which is 2c). Each item below gets its own `/fix` or `/feature` branch when
> picked up. Ordered as reported, not by priority.

## Done (verified `npx tsc --noEmit` clean)

The seven mobile-app fixes from `docs/mobile-app-fixes.md` are applied:

1. `scripts/build-mobile.mjs` - `MOBILE_ROOT_PAGE` now client-side navigates
   (`router.replace`) instead of server `redirect()`, which threw under
   `output: "export"` and shipped a blank error-shell `index.html`.
2. `app/layout.tsx` - added `export const viewport` with `viewportFit: "cover"`
   so `env(safe-area-inset-*)` reports real values (was silently 0 everywhere).
3. `lib/native/use-native-shell.ts` - status bar recolours per route (samples the
   top-edge background luminance; `Style.Dark`=light text, `Style.Light`=dark
   text). Deliberately NON-overlaying (`overlay: false`) - an overlaying bar has
   no backdrop and dark cards scroll under the clock.
4. `app/app/app-theme.ts` + `app/staff/staff-theme.ts` - dropped the doubled
   `pt-[env(safe-area-inset-top)]` from both shells (consumers already add it).
   Paired with #2 by necessity: without #2 the doubling was invisible (both 0).
5. `app/app/orders/page.tsx` - flat `name`/`price` shape (was already fixed).
6. `app/dashboard/admin/orders/page.tsx` - flat shape (customer dashboard page
   was already fixed).

**Still to do for these:** rebuild + `cap sync` each app on the Mac, then rebuild
in Xcode (`App/App/public` is copied at native build time). Post-build checks:
`grep -c __next_error__ out/index.html` -> 0; exported viewport meta includes
`viewport-fit=cover`.

**Unverified / flagged in the doc, not addressed here:**
- Dark screens (`/app/welcome`, `/app/verify`) status-bar path needs a
  signed-out session to confirm.
- iOS WebView origin reports `capacitor://m-staff.baydspa.ca` despite
  `iosScheme: "https"` in `capacitor.config.ts`; HelcimPay refuses non-https
  origins, so iOS payments may be affected. See [[ios-capacitor-cors-scheme]].
  Not investigated. **This overlaps reported issue #2 (post-payment redirect) and
  #5 (card capture) - resolve before shipping payments on iOS.**

## Open reported issues

### RI-1 - Reschedule must pick a FREE slot (not an open date/time)
**Type:** fix. **Surface:** customer + staff apps (reschedule flow).
Reschedule currently opens a bare date/time picker; a user can choose a time the
tech isn't free. `Booking#reschedule!` already validates business hours + travel
+ `no_double_booking` (returns `:slot_taken`/`:outside_hours`/`:not_reachable`),
so the backend rejects a bad time - but the UX is "pick anything, maybe get
rejected." Should constrain the picker to `AvailabilityEngine` free slots for
that tech, like the initial booking flow does.
**Needs:** debug pass to find the reschedule picker component(s) and confirm
whether it already calls an availability endpoint. Likely frontend-only.

### RI-2 - Auto-redirect to home after payment (iOS + Android)
**Type:** fix. **Surface:** customer app (+ any POS pay flow).
After a payment completes, the app does not navigate back into the app (stays on
the payment surface / blank). Should `router.replace` to home (or the booking
confirmation) on payment success.
**Needs:** debug pass at the payment-return handler. Interacts with the
`capacitor://` vs `https` origin flag above (HelcimPay on iOS).

### RI-3 - Phone number required + OTP on signup (CUSTOMERS ONLY)
**Type:** feature. **Surface:** customer signup.
Signup must require a phone number and verify it by OTP. OTP infra exists (Infobip
phone-number OTP login was added - see recent commits `8d38e3e`,
`78dbb26`). Staff/admin login is unchanged. Decision recorded: customers only.
**Needs:** add required phone field + OTP verify step to the customer signup;
reuse the existing Infobip OTP path.

### RI-4 - Messages (text/SMS to customers) not working
**Type:** fix. **Surface:** outbound customer text messages (SMS), NOT the in-app
chat threads (Conversation/Message/ChatChannel - that's separate Phase 2 work).
**Needs:** debug pass to find which send path is broken (Infobip SMS send,
notification->SMS fan-out, or missing/invalid creds). Ground the cause before
fixing - do not guess. User was emphatic this is texts, not chats.

### RI-5 - No-show charge: capture card-on-file at booking
**Type:** feature (largest). **Surface:** booking + no-show flow.
A no-show customer should be chargeable. Decision recorded: **card-on-file at
booking** - capture + tokenize a card during booking (Square/Helcim vault), store
the token, and charge it if the booking is marked `no_show`. This depends on the
audit findings F-01 (nothing sets `no_show`) and F-03 (missed vs no_show model) -
those must be resolved so there IS a no_show transition to hang the charge on.
**Needs:** design pass - card-vaulting flow (which processor vaults? when in the
booking UI?), the no_show status transition + who triggers it, and the charge
action. Confirm processor tokenization support before building.

### RI-6 - Notifications not working
**Type:** fix. **Surface:** push notifications (both apps).
Backend (`PushService`, `Fcm::Client` HTTP v1) and client
(`lib/native/use-push-registration.ts`) both exist, so this is a wiring bug, not a
missing feature.
**Needs:** debug pass along the whole chain - device token registration on the
client, token persisted server-side (`device_tokens`), FCM creds present
(`ENV[...].present?` only, never read values), and the notification actually
enqueuing a push. Find the break before fixing.

## Related audit findings (see findings.md)
- F-01 - `no_show` never set by any code (blocks RI-5).
- F-02 - no scheduled sweep for overdue/missed bookings.
- F-03 - missed (tech fault) vs no_show (client fault) conflated (blocks RI-5).
- F-04 - no appointment-start / post-appointment notification (relates to RI-6).
