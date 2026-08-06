# Beauty @ Your Door — Frontend API Context

**Base URL:** `http://localhost:3000/api/v1` (dev) — set via `VITE_API_URL` or equivalent env var  
**Auth:** Bearer JWT in every authenticated request: `Authorization: Bearer <token>`  
**Content-Type:** `application/json`  
**Pagination:** pass `?page=N` (default 25 per page)

---

## TypeScript Types

```ts
// ── Core ──────────────────────────────────────────────────────────────────

type Role = "customer" | "employee" | "admin"

interface User {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  role: Role
  marketing_opt_in: boolean
  created_at: string
}

interface EmployeeProfile {
  id: number
  title: string | null
  bio: string | null
  photo_url: string | null
  years_experience: number | null
  on_shift: boolean
  active: boolean
  user: User
}

interface ServiceCategory {
  id: number
  name: string
  slug: string
  position: number
  services: Service[]
}

interface Service {
  id: number
  name: string
  description: string | null
  duration_minutes: number
  price: string           // decimal string e.g. "65.00"
  image_url: string | null
  requires_consultation: boolean
  active: boolean
  service_category_id: number
}

interface Address {
  id: number
  label: string | null    // "home" | "work" | "other"
  line1: string
  line2: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  latitude: string | null
  longitude: string | null
  default: boolean
}

type BookingRequestKind   = "on_demand" | "scheduled"
type BookingRequestStatus = "pending" | "assigned" | "booked" | "no_coverage" | "no_availability" | "failed"
type BookingStatus        = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show"

interface BookingRequest {
  id: number
  kind: BookingRequestKind
  status: BookingRequestStatus
  requested_start: string | null
  requested_window_end: string | null
  customer_latitude: string | null
  customer_longitude: string | null
  assigned_distance_km: string | null
  location_source: "live" | "base" | null
  created_at: string
  service: Service
}

interface Booking {
  id: number
  status: BookingStatus
  starts_at: string
  ends_at: string
  subtotal: string
  travel_fee: string
  total: string
  notes: string | null
  cancellation_reason: string | null
  created_at: string
  service: Service
  employee_profile: EmployeeProfile
}

interface Review {
  id: number
  rating: number          // 1–5
  body: string | null
  approved: boolean
  featured: boolean
  created_at: string
  user: User
  employee_profile: EmployeeProfile
}

interface ProductCategory {
  id: number
  name: string
  slug: string
  description: string | null
  image_url: string | null
  position: number
}

interface Product {
  id: number
  name: string
  description: string | null
  sku: string | null
  price: string
  stock_quantity: number
  image_url: string | null
}

interface OrderItem {
  id: number
  quantity: number
  price: string           // snapshot at purchase time
  name: string            // snapshot
  product_id: number
}

interface Order {
  id: number
  status: "pending" | "paid" | "shipped" | "cancelled"
  total: string
  created_at: string
  order_items: OrderItem[]
}

interface GiftCard {
  id: number
  code: string
  initial_balance: string
  current_balance: string
  recipient_email: string | null
  expires_at: string | null
  active: boolean
}

interface LoyaltyTransaction {
  id: number
  points: number          // negative = redemption
  kind: "earn" | "redeem" | "adjust"
  description: string | null
  created_at: string
}

interface LoyaltyAccount {
  id: number
  points_balance: number
  loyalty_transactions: LoyaltyTransaction[]
}

interface BlogPost {
  id: number
  title: string
  slug: string
  excerpt: string | null
  body: string | null
  cover_image_url: string | null
  published_at: string
  author_name: string | null
}

interface BlogComment {
  id: number
  body: string
  approved: boolean
  created_at: string
  author: string          // display name (account or guest)
}

interface ForumCategory {
  id: number
  name: string
  slug: string
  description: string | null
  position: number
}

interface ForumTopic {
  id: number
  title: string
  slug: string
  pinned: boolean
  locked: boolean
  posts_count: number
  last_posted_at: string | null
  created_at: string
  author: string
}

interface ForumPost {
  id: number
  body: string
  created_at: string
  author: string
}

interface ServiceArea {
  id: number
  name: string
  slug: string
  travel_fee: string
  active: boolean
}

// ── Shared ─────────────────────────────────────────────────────────────────

interface Pagination {
  current_page: number
  per_page: number
  total_count: number
  total_pages: number
  next_page: number | null
}

interface PagedResponse<T> {
  data: T[]
  pagination: Pagination
}

interface AuthResponse {
  token: string
  user: User
}

// ── Error shapes ────────────────────────────────────────────────────────────

interface ApiError       { error: string }          // single message
interface ValidationError { errors: string[] }       // field errors from model
```

---

## Auth

### Email / Password

```
POST /auth/register
Body: { user: { email, password, first_name?, last_name?, phone?, marketing_opt_in? } }
→ 201 AuthResponse

POST /auth/login
Body: { email, password }
→ 200 AuthResponse | 401 ApiError

GET  /auth/me           (🔒)
→ 200 User

PATCH /auth/me          (🔒)
Body: { user: { first_name?, last_name?, phone?, marketing_opt_in? } }
→ 200 User
```

### Google SSO

Flow: user taps "Sign in with Google" → Google SDK returns an `id_token` → POST it here.

```
POST /auth/google
Body: { id_token: "<google id token>" }
→ 200 AuthResponse | 401 ApiError
```

> Needs `GOOGLE_CLIENT_ID` in the frontend environment to initialise the Google SDK.  
> If the email already exists (password account), the Google UID is linked — no duplicate user.

---

## Customer Endpoints 🔒

### Booking Flow

```
// Step 1 — create a request (triggers assignment automatically)
POST /booking_requests
Body (on_demand):  { booking_request: { service_id, kind: "on_demand",
                       customer_latitude, customer_longitude } }
Body (scheduled):  { booking_request: { service_id, kind: "scheduled",
                       address_id, requested_start } }
→ 201 { booking_request: BookingRequest, booking?: Booking }
   OR 422 { booking_request: BookingRequest, error: "no_coverage" | "no_availability" }

// Step 2 — list / view results
GET  /booking_requests          → PagedResponse<BookingRequest>
GET  /booking_requests/:id      → BookingRequest
```

**Status meanings for the UI:**

| status | Show |
|---|---|
| `pending` | Spinner — assignment in progress |
| `booked` | Confirmed — show booking card |
| `no_coverage` | "We don't cover your area yet" — capture as lead |
| `no_availability` | "No techs available — try another time" |
| `failed` | Generic error |

```
GET  /bookings              → PagedResponse<Booking>
GET  /bookings/:id          → Booking
POST /bookings/:id/cancel   Body: { reason? }  → Booking
```

### Addresses

```
GET    /addresses           → Address[]
POST   /addresses           Body: { address: { label?, line1, line2?, city?, province?,
                                    postal_code?, default? } }  → 201 Address
PATCH  /addresses/:id       Body: same  → Address
DELETE /addresses/:id       → 204
```

> Coordinates are geocoded server-side on save — no need to send lat/lng.

### Loyalty

```
GET /loyalty   → LoyaltyAccount   (includes full transaction history)
```

### Gift Cards

```
GET  /gift_cards/:code              → GiftCard
POST /gift_cards/:code/redeem       Body: { amount, booking_id? }  → GiftCard
```

### Shop

```
GET /product_categories             → ProductCategory[]
GET /product_categories/:id         → { category: ProductCategory,
                                         products: Product[], pagination: Pagination }
GET /products                       ?category_id=  → PagedResponse<Product>
GET /products/:id                   → Product

GET  /orders                        → PagedResponse<Order>
GET  /orders/:id                    → Order
POST /orders                        Body: { order: { shipping_address_id?,
                                       items: [{ product_id, quantity }] } }
                                    → 201 Order
```

### Reviews

```
GET  /reviews                       ?employee_id=  → PagedResponse<Review>
POST /reviews                       Body: { booking_id, review: { rating, body? } }
                                    → 201 Review
```

> Can only review a `completed` booking. One review per booking.

---

## Public Endpoints (no auth)

```
GET /service_categories             → ServiceCategory[]   (includes services)
GET /services                       ?category_id=  → Service[]
GET /services/:id                   → Service

GET /blog_posts                     → PagedResponse<BlogPost>
GET /blog_posts/:slug               → BlogPost
GET /blog_posts/:slug/blog_comments → PagedResponse<BlogComment>
POST /blog_posts/:slug/blog_comments  Body: { comment: { body, author_name? } }  → 201

GET /forum/categories               → ForumCategory[]
GET /forum/categories/:slug         → ForumCategory
GET /forum/categories/:slug/topics  → PagedResponse<ForumTopic>
GET /forum/topics/:slug             → ForumTopic
GET /forum/topics/:slug/posts       → PagedResponse<ForumPost>

POST /newsletter/subscribe          Body: { email, source? }
GET  /newsletter/unsubscribe        ?token=<unsubscribe_token>

POST /contact                       Body: { message: { name, email, message } }
POST /franchise                     Body: { inquiry: { name, email, phone?, city?, message? } }
POST /careers                       Body: { application: { name, email, phone?,
                                      role_applied_for?, message?, resume_url? } }
```

Forum post/create requires auth:

```
POST /forum/categories/:slug/topics   Body: { topic: { title } }  → 201 ForumTopic
POST /forum/topics/:slug/posts        Body: { post: { body } }     → 201 ForumPost
```

---

## Employee Endpoints 🔒 (role: employee | admin)

```
GET   /employee/profile          → EmployeeProfile
PATCH /employee/profile          Body: { employee: { title?, bio?, photo_url? } }  → EmployeeProfile
POST  /employee/toggle_shift     → { on_shift: boolean }
GET   /employee/schedule         → PagedResponse<Booking>   (active + upcoming only)
```

---

## Admin Endpoints 🔒 (role: admin)

### Staff

```
GET   /admin/employees              ?page=   → PagedResponse<EmployeeProfile>
GET   /admin/employees/:id          → EmployeeProfile
PATCH /admin/employees/:id          Body: { employee: { title?, bio?, photo_url?,
                                      years_experience?, simplybook_unit_id?,
                                      traccar_device_id?, base_latitude?,
                                      base_longitude?, on_shift?, dispatchable?, active? } }
POST  /admin/employees/:id/toggle_shift      → { on_shift: boolean }
POST  /admin/employees/:id/toggle_dispatch   → { dispatchable: boolean }
```

### Bookings

```
GET   /admin/bookings               ?status=  ?employee_id=  ?page=
                                    → PagedResponse<Booking>
GET   /admin/bookings/:id           → Booking
PATCH /admin/bookings/:id           Body: { status, cancellation_reason? }  → Booking
```

### Assignment Audit Log

```
GET /admin/assignment_attempts      ?booking_request_id=  → PagedResponse (raw JSON)
GET /admin/assignment_attempts/:id  → full attempt with candidates array
```

Candidate shape inside `candidates` jsonb:

```ts
interface AssignmentCandidate {
  employee_id: number
  distance_km: number
  source: "live" | "base"
}
```

### Reviews

```
GET    /admin/reviews               ?approved=true|false  → PagedResponse<Review>
POST   /admin/reviews/:id/approve   → Review
POST   /admin/reviews/:id/feature   → Review   (toggles featured)
DELETE /admin/reviews/:id           → 204
```

### Service Areas

```
GET    /admin/service_areas         → ServiceArea[]
POST   /admin/service_areas         Body: { service_area: { name, slug, travel_fee, active? } }
PATCH  /admin/service_areas/:id     Body: same
DELETE /admin/service_areas/:id     → 204
```

### Inquiries

```
GET   /admin/inquiries/franchise    → PagedResponse (raw)
GET   /admin/inquiries/jobs         → PagedResponse (raw)
GET   /admin/inquiries/contacts     → PagedResponse (raw)
PATCH /admin/inquiries/franchise/:id  Body: { status: "new"|"contacted"|"closed" }
PATCH /admin/inquiries/jobs/:id       Body: { status: "new"|"reviewing"|"rejected"|"hired" }
```

### Content Moderation

```
GET    /admin/content/blog_comments              → PagedResponse<BlogComment>
POST   /admin/content/blog_comments/:id/approve  → 200
DELETE /admin/content/blog_comments/:id          → 204

GET   /admin/content/blog_posts                  → PagedResponse<BlogPost>
PATCH /admin/content/blog_posts/:id              Body: { status: "draft"|"published"|"archived" }
```

---

## Dashboard Map

### Customer `/dashboard`

| Section | Endpoint(s) |
|---|---|
| Upcoming bookings (home) | `GET /bookings` filter `status=confirmed` client-side |
| Book now flow | `GET /service_categories` → `POST /booking_requests` |
| All bookings | `GET /bookings` |
| Booking detail + cancel | `GET /bookings/:id` · `POST /bookings/:id/cancel` |
| Leave review | `POST /reviews` (on completed booking card) |
| Addresses | `GET/POST/PATCH/DELETE /addresses` |
| Loyalty points | `GET /loyalty` |
| Gift card lookup | `GET /gift_cards/:code` |
| Shop | `GET /product_categories` → `GET /products` → `POST /orders` |
| Order history | `GET /orders` |
| Account settings | `GET /auth/me` · `PATCH /auth/me` |

### Employee `/employee`

| Section | Endpoint(s) |
|---|---|
| Shift toggle (header) | `POST /employee/toggle_shift` |
| Today's schedule | `GET /employee/schedule` |
| Profile editor | `GET /employee/profile` · `PATCH /employee/profile` |
| My reviews | `GET /reviews?employee_id=<own_id>` |

### Admin `/admin`

| Section | Endpoint(s) |
|---|---|
| Overview stats | `GET /admin/bookings` (today) · `GET /admin/employees` |
| Bookings table | `GET /admin/bookings` with status/employee filters |
| Staff list + edit | `GET/PATCH /admin/employees` + toggle endpoints |
| Coverage map | `GET /admin/employees` → render lat/lng client-side on a map |
| Assignment debug | `GET /admin/assignment_attempts?booking_request_id=` |
| Leads (no_coverage) | `GET /admin/bookings?status=no_coverage` |
| Franchise inquiries | `GET /admin/inquiries/franchise` |
| Job applications | `GET /admin/inquiries/jobs` |
| Contact messages | `GET /admin/inquiries/contacts` |
| Service areas | `GET/POST/PATCH/DELETE /admin/service_areas` |
| Review moderation | `GET /admin/reviews?approved=false` + approve/feature/delete |
| Blog moderation | `GET /admin/content/blog_posts` · `PATCH` to publish |
| Comment moderation | `GET /admin/content/blog_comments` + approve/delete |

---

## Error Handling

```ts
// All errors return one of:
{ error: string }         // 401, 403, 404, 422 (single), 429
{ errors: string[] }      // 422 validation (multiple field errors)

// HTTP status codes used:
// 200 OK · 201 Created · 204 No Content
// 400 Bad Request (missing required param)
// 401 Unauthorized (no/invalid token)
// 403 Forbidden (wrong role)
// 404 Not Found
// 422 Unprocessable (validation failed)
// 429 Too Many Requests (rate limited — 10/min on auth, 60/min elsewhere)
```

---

## Notes for the Frontend Dev

1. **Money fields** are decimal strings (`"65.00"`) — use a library like `dinero.js` or `Intl.NumberFormat` to display. Never parse as float.
2. **Dates** are ISO 8601 UTC strings — convert to local time with `Intl.DateTimeFormat` or `date-fns`.
3. **Booking request vs Booking** — a `BookingRequest` is the intent; a `Booking` is the confirmed job. After `POST /booking_requests`, check `status`:
   - `booked` → `booking` is present in the response, show it
   - `no_coverage` / `no_availability` → show the appropriate message, no booking created
4. **On-demand booking** requires the browser's `getCurrentPosition()` — ask for permission before showing the booking form and pass `customer_latitude` / `customer_longitude`.
5. **Scheduled booking** uses the saved address, no GPS needed.
6. **Google SSO** — use `@react-oauth/google` (web) or `@react-native-google-signin/google-signin` (mobile). Pass the resulting `credential` (web) or `idToken` (mobile) as `id_token` to `POST /auth/google`.
7. **JWT expiry** is 30 days. Store in `httpOnly` cookie or secure storage — not `localStorage`. Refresh by re-authenticating (no refresh token endpoint yet).
8. **Pagination** — all paged responses follow `{ data: T[], pagination: Pagination }`. Use `next_page` to determine if there's more to load.
9. **Rate limiting** — if you get a 429, back off for 60 seconds. Auth endpoints are stricter (10/min).
