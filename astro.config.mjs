import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const site = process.env.PUBLIC_SITE_URL || "http://localhost:4321";

export default defineConfig({
  site,
  output: "static",
  integrations: [sitemap()],
  vite: {
    server: {
      allowedHosts: ["demonstrate-wilderness-retreat-losses.trycloudflare.com"],
    },
  },
});
