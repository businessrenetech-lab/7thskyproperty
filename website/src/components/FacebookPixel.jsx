"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

/**
 * Facebook Pixel (Client-Side) + fbc/fbp cookie forwarding for CAPI deduplication.
 *
 * This component:
 * 1. Loads the Facebook Pixel base code
 * 2. Fires PageView on every route change (SPA navigation)
 * 3. Exposes a global `fbq` function for custom events
 * 4. Provides helper functions for reading _fbc/_fbp cookies
 */

// ─── Cookie Helpers ──────────────────────────────────────────
export function getCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getFbClickId() {
  return getCookie("_fbc");
}

export function getFbBrowserId() {
  return getCookie("_fbp");
}

/**
 * Get FB tracking cookies as headers to send with API requests.
 * Your backend facebookCapi.service.js reads these headers.
 */
export function getFbHeaders() {
  const headers = {};
  const fbc = getFbClickId();
  const fbp = getFbBrowserId();
  if (fbc) headers["x-fbc"] = fbc;
  if (fbp) headers["x-fbp"] = fbp;
  return headers;
}

// ─── Pixel Component ─────────────────────────────────────────
export default function FacebookPixel() {
  const pathname = usePathname();

  // Fire PageView on every client-side route change
  useEffect(() => {
    if (!FB_PIXEL_ID || typeof window === "undefined") return;
    if (window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [pathname]);

  if (!FB_PIXEL_ID) return null;

  return (
    <>
      <Script
        id="fb-pixel-base"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${FB_PIXEL_ID}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
