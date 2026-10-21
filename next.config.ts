import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const analyticsHost = process.env.NEXT_PUBLIC_POSTHOG_KEY
  ? (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com").replace(/\/$/, "")
  : null;

/**
 * The Content-Security-Policy is what backs the "nothing is uploaded" promise:
 * connect-src only allows our own origin (plus the analytics endpoint, if
 * configured), so page scripts cannot send files anywhere else.
 *
 * The app routes also allow 'unsafe-eval' because the open-source HEIC decoder
 * (libheif compiled with Emscripten) needs it to run. It does not widen where
 * data can be sent.
 */
function csp({ allowEval }: { allowEval: boolean }) {
  const script = ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", allowEval || !isProd ? "'unsafe-eval'" : ""].filter(Boolean);
  const connect = ["'self'", analyticsHost ?? "", !isProd ? "ws:" : ""].filter(Boolean);
  return [
    "default-src 'self'",
    `script-src ${script.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    `connect-src ${connect.join(" ")}`,
    "worker-src 'self' blob:",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'none'",
    isProd ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: [...baseHeaders, { key: "Content-Security-Policy", value: csp({ allowEval: false }) }] },
      // App routes that decode HEIC photos need eval for the libheif decoder.
      { source: "/build", headers: [{ key: "Content-Security-Policy", value: csp({ allowEval: true }) }] },
      { source: "/fix", headers: [{ key: "Content-Security-Policy", value: csp({ allowEval: true }) }] },
      {
        source: "/vendor/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }],
      },
    ];
  },
};

export default nextConfig;
