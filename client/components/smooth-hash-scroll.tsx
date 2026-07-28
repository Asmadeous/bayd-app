"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const pendingHashKey = "pending-hash-scroll";

function scrollToHash(hash: string) {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  const target = document.getElementById(id);

  if (!target) {
    return false;
  }

  target.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

export function SmoothHashScroll() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const link = target.closest<HTMLAnchorElement>("a[href]");

      if (!link || link.target || link.hasAttribute("download")) {
        return;
      }

      const url = new URL(link.href, window.location.href);

      if (url.origin !== window.location.origin || !url.hash) {
        return;
      }

      event.preventDefault();

      if (url.pathname === window.location.pathname) {
        window.history.pushState(null, "", `${url.pathname}${url.hash}`);
        scrollToHash(url.hash);
        return;
      }

      window.sessionStorage.setItem(pendingHashKey, url.hash);
      router.push(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
    }

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [router]);

  useEffect(() => {
    const pendingHash =
      window.sessionStorage.getItem(pendingHashKey) || window.location.hash;

    if (!pendingHash) {
      return;
    }

    window.sessionStorage.removeItem(pendingHashKey);

    const frame = window.requestAnimationFrame(() => {
      scrollToHash(pendingHash);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
}
