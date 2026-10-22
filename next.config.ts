import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const analyticsHost = process.env.NEXT_PUBLIC_POSTHOG_KEY
  ? (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com").replace(/\/$/, "")
  : null;

// The legal pages and checkout must name a real operator and contact before the live site goes up (Netlify sets
// CONTEXT=production for the live site; previews and local builds are unaffected).
if (process.env.CONTEXT === "production") {
  const missing = ["NEXT_PUBLIC_OPERATOR_NAME", "NEXT_PUBLIC_SUPPORT_EMAIL"].filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) throw new Error(`Set ${missing.join(" and ")} before deploying to production (see docs/launch/DEPLOY.md).`);
}

/**
 * The Content-Security-Policy limits where the page can send data: connect-src only allows our own origin (plus the
 * analytics endpoint, if configured).
 *
 * One policy for every page: a browser keeps the policy of the first page it loads, and moving between pages
 * doesn't reload it. 'unsafe-eval' is needed by the open-source HEIC decoder (libheif compiled with Emscripten),
 * which runs in a worker that inherits the page's policy. It doesn't widen where data can be sent.
 */
function csp() {
  const script = ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", "'unsafe-eval'"];
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
    "form-action 'self'",
    "frame-ancestors 'none'",
    isProd ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

const baseHeaders = [
  { key: "Content-Security-Policy", value: csp() },
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
      { source: "/:path*", headers: baseHeaders },
      // pdf.js assets live under a versioned folder, so they can be cached for good.
      {
        source: "/vendor/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }],
      },
    ];
  },
};

export default nextConfig;
