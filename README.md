# AB Website

Static Astro website for AB, an Azerbaijani student opportunities and educational news platform.

The public routes are bilingual:

- Azerbaijani: `/az/`
- English: `/en/`

`/` redirects to `/az/`.

## Run Locally

```bash
export PATH=/home/osman/.local/node-v22.19.0-linux-x64/bin:$PATH
cd /home/osman/ab-website
npm install
npm run dev
```

## Build

```bash
export PATH=/home/osman/.local/node-v22.19.0-linux-x64/bin:$PATH
cd /home/osman/ab-website
npm run build
```

The static output is generated in `dist/`.

## Content

Edit opportunities in `src/data/opportunities.json` and news in `src/data/news.json`.

See `CONTENT_GUIDE.md` for field explanations and maintenance instructions.

Instagram and WhatsApp links are configured centrally in `src/lib/siteConfig.ts`.
