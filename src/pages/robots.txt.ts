export function GET({ site }: { site: URL }) {
  const baseUrl = site.toString().replace(/\/$/, "");

  return new Response(`User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap-index.xml
`);
}
