#!/usr/bin/env node
// Builds a mobile app: a static export of just that app's routes. The website has
// marketing/admin/other-role routes (some SSR) that can't static-export and don't
// belong in a given app, so we temporarily move the excluded routes aside, run
// `MOBILE_BUILD=1 next build` (output: "export" -> out/), then restore everything.
// Nothing is permanently changed.
//
// Usage: node scripts/build-mobile.mjs [customer|employee]   (default: customer)
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";

const APP = "app";
const STASH = ".mobile-stash"; // temp home for excluded routes during the build

const which = process.argv[2] || "customer";

// Note: detail pages that used to be dynamic [id] routes (admin employee KPI,
// blog editor) now take the id as a query param (?id=) so they're plain static
// pages that export cleanly — no [id] segment, no generateStaticParams needed.

// Marketing / SEO routes: never in any app.
const MARKETING = [
  "about", "blog", "careers", "gallery", "prices", "services", "shop", "team",
  "robots.ts", "sitemap.ts", "manifest.ts",
];

// Per-app: which dashboards to EXCLUDE (keep only this app's role).
const EXCLUDE_BY_APP = {
  customer: [...MARKETING, "dashboard/employee", "dashboard/admin"],
  employee: [...MARKETING, "dashboard/customer", "dashboard/admin"],
  admin: [...MARKETING, "dashboard/customer", "dashboard/employee"],
};

const EXCLUDE = EXCLUDE_BY_APP[which];
if (!EXCLUDE) {
  console.error(`[build-mobile] unknown app "${which}" (expected customer|employee|admin)`);
  process.exit(1);
}

const moved = [];
const stashPath = (p) => join(STASH, p);

function moveOut(p) {
  const src = join(APP, p);
  if (!existsSync(src)) return;
  const dst = stashPath(p);
  mkdirSync(dirname(dst), { recursive: true });
  renameSync(src, dst);
  moved.push(p);
}

function restoreAll() {
  for (const p of moved.reverse()) {
    const src = stashPath(p);
    const dst = join(APP, p);
    if (existsSync(src)) {
      mkdirSync(dirname(dst), { recursive: true });
      renameSync(src, dst);
    }
  }
  if (existsSync(STASH)) rmSync(STASH, { recursive: true, force: true });
}

try {
  console.log(`[build-mobile] app: ${which} — excluding non-${which} routes...`);
  for (const p of EXCLUDE) moveOut(p);

  // A phone can't reach localhost:3000 — the mobile bundle bakes in the real API
  // URL. Default to production; override with MOBILE_API_URL for a device pointing
  // at a dev machine (e.g. http://192.168.x.x:3000/api/v1).
  const apiUrl = process.env.MOBILE_API_URL || "https://api.baydspa.ca/api/v1";
  console.log(`[build-mobile] API base: ${apiUrl}`);

  console.log("[build-mobile] building static export (out/)...");
  execSync("MOBILE_BUILD=1 next build", {
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_API_URL: apiUrl },
  });

  console.log("[build-mobile] done -> out/");
} finally {
  console.log("[build-mobile] restoring routes...");
  restoreAll();
}
