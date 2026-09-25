#!/usr/bin/env node
// Builds a mobile app bundle: a static export of ONLY the purpose-built app
// (app/app/*) plus the minimal shared shell it needs - NOT the website. The
// website's marketing + dashboard + auth routes stay out of the APK.
//
// Approach: an ALLOWLIST. Everything under app/ that isn't required by the app
// is temporarily moved aside, the root marketing homepage is swapped for a
// redirect into /app, then `MOBILE_BUILD=1 next build` (output: "export" -> out/)
// runs, then everything is restored. Nothing is permanently changed.
//
// Usage: node scripts/build-mobile.mjs [customer|employee|admin]  (default: customer)
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";

const APP = "app";
const STASH = ".mobile-stash"; // temp home for excluded routes during the build

const which = process.argv[2] || "customer";
const VALID = ["customer", "employee", "admin"];
if (!VALID.includes(which)) {
  console.error(`[build-mobile] unknown app "${which}" (expected ${VALID.join("|")})`);
  process.exit(1);
}

// Each app is a DIFFERENT purpose-built route tree under app/. The build keeps
// only that app's tree (plus the required root shell) and stashes everything
// else, then swaps the marketing root page for a redirect into the app.
//   customer -> app/app     (Book tab reuses app/book's BookingFlow)
//   employee -> app/staff   (self-contained New booking form, no app/book)
//   admin    -> app/admin
const APP_ROUTES = {
  customer: { dir: "app", entry: "/app/home", reusesBook: true },
  employee: { dir: "staff", entry: "/staff/schedule", reusesBook: false },
  admin: { dir: "admin", entry: "/admin", reusesBook: false },
};
const appRoute = APP_ROUTES[which];

// KEEP in the bundle: this app's route tree, the required root shell files, and
// auth/callback (magic-link + Google OAuth 302 back through it on sign-in).
// Everything else under app/ is moved out before the export. dotfiles are left
// in place. The root page.tsx is handled specially (swapped for a redirect).
const KEEP = new Set([
  appRoute.dir,     // this app's purpose-built route tree
  "auth",           // app/auth/callback - sign-in return URL
  "layout.tsx",     // required root layout (wires Providers / QueryClient)
  "providers.tsx",
  "globals.css",
  "not-found.tsx",
  "favicon.ico",
  "icon.png",
  "apple-icon.png",
  // page.tsx is swapped, not kept as-is (see below).
]);
// app/book exports BookingFlow, which the customer Book tab imports + renders
// (dashboardMode). Keep it only for apps that use it: it drags in the website's
// components/layout chrome, so it must not reach the staff or admin bundles.
// The bare /book route it adds is harmless (nothing links to it).
if (appRoute.reusesBook) KEEP.add("book");

// A tiny root page for the app build: "/" sends the WebView into this app's
// entry. Replaces the marketing homepage (features/home + SEO) so it never
// bundles.
//
// This MUST be a client-side navigation. `redirect()` from next/navigation
// needs a server to answer with a 307 - under output: "export" there is none,
// so the prerender throws and index.html is written out as an empty error
// shell (<html id="__next_error__">). Capacitor opens index.html, so the app
// would come up blank and never reach the entry route. The entry is the final
// landing screen, not /app or /staff: those redirect() again, and following that
// hop reloaded the whole page, mounting the launch splash twice (it jumped).
const MOBILE_ROOT_PAGE = `"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function MobileRoot() {
  const router = useRouter()

  useEffect(() => {
    router.replace("${appRoute.entry}")
  }, [router])

  return null
}
`;

const moved = [];
const stashPath = (p) => join(STASH, p);

function moveOut(name) {
  const src = join(APP, name);
  if (!existsSync(src)) return;
  const dst = stashPath(name);
  mkdirSync(dirname(dst), { recursive: true });
  renameSync(src, dst);
  moved.push(name);
}

function restoreAll() {
  for (const name of moved.reverse()) {
    const src = stashPath(name);
    const dst = join(APP, name);
    if (existsSync(src)) {
      mkdirSync(dirname(dst), { recursive: true });
      renameSync(src, dst);
    }
  }
  if (existsSync(STASH)) rmSync(STASH, { recursive: true, force: true });
}

let rootPageSwapped = false;
const rootPage = join(APP, "page.tsx");
const rootPageStash = stashPath("page.tsx");

// public/images is ~150MB of marketing/gallery photos the website serves but the
// app never bundles (app screens use API image URLs). Everything in public/ is
// copied verbatim into the static export, so we temporarily move public/images
// aside for the build, restoring ONLY the few assets the app actually references
// (the brand logo dir + a fallback image), then put the full folder back after.
const PUBLIC_IMAGES = join("public", "images");
const IMAGES_STASH = join(STASH, "public-images");
const APP_IMAGE_ASSETS = ["brand", "lashes1.jpg"]; // referenced under app/app/*
let imagesStashed = false;

function stashPublicImages() {
  if (!existsSync(PUBLIC_IMAGES)) return;
  mkdirSync(dirname(IMAGES_STASH), { recursive: true });
  renameSync(PUBLIC_IMAGES, IMAGES_STASH);
  imagesStashed = true;
  // Recreate public/images with only what the app uses.
  mkdirSync(PUBLIC_IMAGES, { recursive: true });
  for (const asset of APP_IMAGE_ASSETS) {
    const from = join(IMAGES_STASH, asset);
    if (existsSync(from)) cpSync(from, join(PUBLIC_IMAGES, asset), { recursive: true });
  }
}

function restorePublicImages() {
  if (!imagesStashed) return;
  rmSync(PUBLIC_IMAGES, { recursive: true, force: true });
  renameSync(IMAGES_STASH, PUBLIC_IMAGES);
}

try {
  console.log(`[build-mobile] app: ${which} - bundling ONLY app/app + shell (allowlist)...`);

  // Move out everything under app/ that isn't in KEEP (and isn't a dotfile).
  for (const name of readdirSync(APP)) {
    if (name.startsWith(".")) continue;
    if (name === "page.tsx") continue; // handled by the swap below
    if (KEEP.has(name)) continue;
    moveOut(name);
  }


  // Swap the marketing root page for the redirect-into-app page.
  if (existsSync(rootPage)) {
    mkdirSync(dirname(rootPageStash), { recursive: true });
    renameSync(rootPage, rootPageStash);
    writeFileSync(rootPage, MOBILE_ROOT_PAGE);
    rootPageSwapped = true;
  }

  // Drop the ~150MB marketing image library from the bundle (keep only the
  // app's own assets).
  stashPublicImages();

  // A phone can't reach localhost:3000 - the bundle bakes in the real API URL.
  // Default to production; override with MOBILE_API_URL for a device pointing at
  // a dev machine (e.g. http://192.168.x.x:3000/api/v1).
  const apiUrl = process.env.MOBILE_API_URL || "https://api.baydspa.ca/api/v1";
  console.log(`[build-mobile] API base: ${apiUrl}`);

  console.log("[build-mobile] building static export (out/)...");
  // Use the local next binary (npx) - execSync's /bin/sh doesn't get npm's
  // node_modules/.bin on PATH the way an npm script would.
  execSync("MOBILE_BUILD=1 npx --no-install next build", {
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_API_URL: apiUrl },
  });

  console.log("[build-mobile] done -> out/");
} finally {
  console.log("[build-mobile] restoring routes + images...");
  // Restore the real root page first (remove the temporary redirect).
  if (rootPageSwapped && existsSync(rootPageStash)) {
    rmSync(rootPage, { force: true });
    renameSync(rootPageStash, rootPage);
  }
  restorePublicImages();
  restoreAll();
}
