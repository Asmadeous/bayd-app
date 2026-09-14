# Coding Standards

> Reflects the real B.A.Y.D stack: Rails 8.1 API (primary) + Next.js 16 client in
> `client/` (secondary). Adapted from the Blueprint defaults during `/adopt`.

## Ruby / Rails (backend — the primary app)

- Ruby 4.0.2, Rails 8.1, API-only (`config.api_only = true`). No server-rendered
  Rails views except mailer templates.
- Follow **rubocop-rails-omakase** — it is the style authority. Run `bin/rubocop`;
  it must be clean before a step is done.
- Fat-model / service-object architecture. Non-trivial domain logic lives in
  `app/services/` (e.g. `AssignmentService`, `AddonBooker`, `TravelFeasibility`,
  `BookingPaymentService`), not in controllers. Controllers stay thin.
- Serialization via **Blueprinter** (`app/serializers/*Serializer`). Don't render
  raw model JSON.
- Background work via **Solid Queue** (`app/jobs/`). Cache via **Solid Cache**.
  No Redis — the app is deliberately Postgres-only for queue/cache/cable.
- Timezones: booking times are wall-clock in the company zone, stored UTC. Use the
  `BusinessHours` helpers (`BusinessHours.zone`, `parse_local`) — never hand-roll
  UTC math.
- Money is `decimal`, never float.
- Scope every user-owned query by the authenticated user; never trust a
  client-supplied user id. Booking is guest-friendly but email-keyed.
- Guard concurrency at the database: the `no_double_booking` Postgres exclusion
  constraint is authoritative; a conflict surfaces as a clean 422, not a 500.

## Migrations

- Standard Rails migrations (`bin/rails g migration`, `bin/rails db:migrate`).
- `db/schema.rb` is the checked-in source of truth; keep it in sync.
- Production seeds (`db/seeds.rb`) run on every deploy — writes must be
  idempotent (`find_or_create_by!`) and must never overwrite live state (e.g. a
  tech's changed password or shift status).

## TypeScript / React / Next.js (client)

- Next.js 16 App Router, React 19, TypeScript strict. Client lives in `client/`.
- **This is not stock Next.js** — read `client/AGENTS.md` / `node_modules/next/dist/docs/`
  before writing client code; APIs may differ from training data.
- Functional components + hooks only. Data fetching via **TanStack Query** against
  the Rails API (`NEXT_PUBLIC_API_URL`), not Prisma/Server Actions — there is no
  Prisma and no app database on the client.
- Tailwind for styling. No inline styles. Base UI (`@base-ui/react`) components.
- `no any` — type API responses and props.

## Naming

- Ruby: `snake_case` methods/files, `CamelCase` classes, `SCREAMING_SNAKE` consts.
- TS: `camelCase` functions, `PascalCase` components/types, files match component.

## Error Handling

- Rails: rescue at the right altitude; map known failures to specific HTTP status
  (422 for conflicts/validation, 401/403 for auth) via `rescue_from`. Never let a
  handled failure become a 500.
- Best-effort side effects (SimplyBook push, admin emails, push notifications) are
  wrapped so they can NEVER break the core request — log and move on.

## Testing

The project uses **RSpec** (`spec/`, ~40 spec files). The test command is
`bundle exec rspec` — declared in `AGENTS.md` Commands, so **tests are a gate for
logic-bearing steps**.

- **What to test:** domain logic where a wrong answer is possible — services
  (assignment, availability, add-ons, payments, travel), model methods, request
  specs for controller contracts (status codes, shapes, auth scoping).
- **What not to unit-test:** the Next.js UI and full external integrations —
  verify those by driving the running app / build.
- **The gate:** a step that adds in-scope logic ships a passing spec in the same
  diff. `bundle exec rspec` (relevant files) green before approval, before any
  checkpoint commit, and before `/complete`. Also keep `bin/rubocop` and
  `bin/brakeman` clean.
- External services are stubbed in specs (no live SimplyBook/Square/Helcim calls).
- Client logic changes: `npx tsc --noEmit` and `npm run lint` (in `client/`) green.

> Note: `bin/ci` (the `Verify` command) runs setup + rubocop + bundler-audit +
> brakeman — it does NOT run rspec. Run `bundle exec rspec` separately as the
> logic gate; don't assume `bin/ci` covered the tests.

## Browser / app verification

For UI and end-to-end behavior, prefer real evidence over reading code:

- Drive the running app (`bin/dev` — Rails :3000 + Next :3003) and observe the
  flow, or exercise the API directly (curl / request spec).
- Playwright is not installed; don't add it silently mid-feature. Use dev-server
  screenshots, build output, or API output instead.

## Code Quality

- No commented-out code. No unused imports/variables.
- Keep methods small and single-purpose; push logic out of controllers.

## Comments

Write code that explains itself; comment only what the code cannot say.
Over-commenting is a common AI tell, so resist it.

- Comment the **why**, not the **what**. Delete any comment that restates the code.
- No banner/header blocks or step-by-step narration of obvious code.
- A comment earns its place only when it captures a non-obvious decision, a gotcha
  or workaround, why a value is what it is, or a link to a spec/issue.
- Match the surrounding file's comment density and idiom.
- When in doubt, leave the comment out.

## Writing

- No em dashes (U+2014) in generated content: docs, comments, commit messages,
  READMEs, specs. They read as AI-generated.
- Use a hyphen for `term - description` separators; rephrase prose with commas,
  parentheses, or a colon. Avoid en dashes and the ellipsis character too.
