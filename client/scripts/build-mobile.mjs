#!/usr/bin/env node
// Builds the CUSTOMER mobile app: a static export of just the customer-facing
// routes. The website has marketing/admin/employee routes (some SSR) that can't
// static-export and don't belong in the customer app, so we temporarily move
// them aside, run `MOBILE_BUILD=1 next build` (output: "export" -> out/), then
// restore everything. Nothing is permanently changed.
//
// Usage: node scripts/build-mobile.mjs
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";

const APP = "app";
const STASH = ".mobile-stash"; // temp home for excluded routes during the build

// Routes NOT in the customer app (marketing, admin, employee, SEO files).
const EXCLUDE = [
  "about", "blog", "careers", "gallery", "prices", "services", "shop", "team",
  "dashboard/employee", "dashboard/admin",
  "robots.ts", "sitemap.ts", "manifest.ts",
];

const moved = [];

function stashPath(p) {
  return join(STASH, p);
}

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
  console.log("[build-mobile] excluding non-customer routes...");
  for (const p of EXCLUDE) moveOut(p);

  // A phone can't reach localhost:3000 — the mobile bundle must bake in the real
  // API URL. Default to production; override with MOBILE_API_URL for a device
  // pointing at a dev machine (e.g. http://192.168.x.x:3000/api/v1).
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
