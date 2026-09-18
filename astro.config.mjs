import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const site = process.env.PUBLIC_SITE_URL || "http://localhost:4321";

export default defineConfig({
  site,
  output: "static",
  redirects: {
    "/": { status: 308, destination: "/az/" },
  },
  build: {
    // Vercel serves the HTTP redirect declared in vercel.json; do not emit a
    // static HTML/meta-refresh fallback for the root route.
    redirects: false,
  },
  integrations: [sitemap()],
  vite: {
    server: {
      allowedHosts: ["demonstrate-wilderness-retreat-losses.trycloudflare.com"],
    },
  },
});
