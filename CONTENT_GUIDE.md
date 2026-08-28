# AB Content Guide

AB is a static website. There is no backend, database, login system, admin panel, Firebase, or Supabase.

To update the site, edit the JSON content files and rebuild the static site.

## Main Files

- Opportunities: `src/data/opportunities.json`
- News: `src/data/news.json`
- Opportunity categories: `src/data/categories.json`
- Social links and brand config: `src/lib/siteConfig.ts`

## Languages

The site supports:

- Azerbaijani: `az`
- English: `en`

Azerbaijani is the default public language. Main URLs are:

- `/az/`
- `/en/`

Most AB-written text should have both language versions:

```json
"summary": {
  "az": "Azərbaycan dilində xülasə",
  "en": "English summary"
}
```

Do not translate official program names unless there is a standard official translated name. For example, keep `Breakthrough Junior Challenge` the same in both languages.

## 1. How Bilingual Opportunity Content Works

Each opportunity is one shared record. Do not duplicate the whole object for Azerbaijani and English.

Shared fields stay once:

- `slug`
- `categories`
- `deadline`
- `imagePosition`
- `detailFacts`
- `organizer`
- `officialUrl`
- `officialCta`
- `dateAdded`
- `lastVerified`
- `featured`
- `isDemo`

Bilingual fields use `az` and `en`:

- `title`
- `summary`
- `description`
- `eligibilitySummary`
- `eligibility`
- `image.alt`

`description` is a list of paragraphs in each language:

```json
"description": {
  "az": ["Birinci abzas.", "İkinci abzas."],
  "en": ["First paragraph.", "Second paragraph."]
}
```

## 2. Add an Opportunity

Open `src/data/opportunities.json`.

Copy an existing object, paste it before the closing `]`, and edit the fields.

Important fields:

- `slug`: unique URL text, for example `breakthrough-junior-challenge`
- `title.az` and `title.en`: title in both languages; keep official program names unchanged
- `summary.az` and `summary.en`: short card summary
- `description.az` and `description.en`: detail-page paragraphs
- `categories`: category keys from `src/data/categories.json`
- `deadline`: `YYYY-MM-DD`, or `null` when there is no fixed deadline
- `imagePosition`: optional image crop position, such as `center center`, `center top`, or `50% 20%`
- `detailFacts`: optional extra facts for the detail page only, such as event date, participation cost, team size, or format
- `eligibilitySummary.az` and `eligibilitySummary.en`: short age/grade/audience note for cards
- `eligibility.az` and `eligibility.en`: full eligibility details
- `organizer`: official organizer/source name
- `officialUrl`: official source link
- `officialCta`: optional custom text for the official source button
- `image`: image object or `null`
- `dateAdded`: when AB added the item, in `YYYY-MM-DD`
- `lastVerified`: optional date when AB last checked the information
- `featured`: `true` or `false`
- `isDemo`: use `true` only for sample/demo content

Opportunity cards are intentionally short. Put only the quick audience note in `eligibilitySummary` and keep longer rules, costs, team size, and application details in `description`, `eligibility`, or `detailFacts`.

Images should be official opportunity imagery. Put all manually selected opportunity and news images in `public/images/`. Reuse this folder; do not create a new image folder convention.

Use slug-based kebab-case filenames, for example:

```text
nasa-space-apps-2026.png
breakthrough-junior-challenge-2026.png
```

Reference images from JSON with `/images/filename.png`, like this:

```json
"image": {
  "src": "/images/example-opportunity.jpg",
  "alt": {
    "az": "Şəklin Azərbaycan dilində təsviri",
    "en": "English description of the image"
  }
}
```

Then, if needed, add `imagePosition` next to `image`:

```json
"imagePosition": "center top"
```

The website uses `object-fit: cover`, so some cropping is normal. `imagePosition` controls which part of the image stays visible:

- `center center`: default balanced crop
- `center top`: keeps top logos or text more visible
- `50% 20%`: fine-tunes the crop with horizontal and vertical percentages

If important text, logos, or faces are cut off, first try `center top`. If that is not precise enough, use percentages such as `50% 20%` and rebuild the site to check the result.

If there is no useful official image, use:

```json
"image": null
```

Optional detail-page facts look like this:

```json
"detailFacts": [
  {
    "label": { "az": "İştirak haqqı", "en": "Participation cost" },
    "value": { "az": "Pulsuz", "en": "Free" }
  }
]
```

## 3. Edit an Opportunity

Find the opportunity by `slug` or title in `src/data/opportunities.json`, edit the relevant field, save, and rebuild.

Avoid changing `slug` after publishing because it changes the page URL in both languages.

## 4. Archive or Remove an Opportunity

To archive an opportunity, keep it in the JSON file and keep its real past `deadline`.

Expired opportunities are hidden from the normal active feed by default, but their detail pages remain generated.

To remove an opportunity completely, delete its full object from `src/data/opportunities.json`.

## 5. How Bilingual News Content Works

Each news article is one shared record.

Shared fields:

- `slug`
- `publishedDate`
- `sourceName`
- `sourceUrl`
- `imagePosition`
- `isDemo`

Bilingual fields:

- `title`
- `summary`
- `body`
- `image.alt`
- `tags`

Tags are written as objects:

```json
"tags": [
  { "az": "Təhsil", "en": "Education" }
]
```

## 6. Add a News Article

Open `src/data/news.json`.

Copy an existing article object, paste it before the closing `]`, and edit:

- `slug`
- `title.az` and `title.en`
- `summary.az` and `summary.en`
- `body.az` and `body.en`
- `publishedDate`
- `sourceName`
- `sourceUrl`
- `image` or `null`
- `imagePosition` if the image needs crop adjustment
- `tags`
- `isDemo`

## 7. How Deadlines Work

Opportunity deadlines use machine-readable dates:

```json
"deadline": "2026-09-15"
```

Status behavior:

- Future deadline: open
- Deadline within 7 days: closing soon
- Past deadline: expired
- `null`: no fixed deadline

Expired opportunities do not appear in the normal active feed by default.

## 8. How `lastVerified` Works

`lastVerified` means the date AB last checked that the opportunity information was still accurate.

Example:

```json
"lastVerified": "2026-08-27"
```

It is optional. If it is missing, the site still builds.

## 9. Social Links

Instagram and WhatsApp links are configured in:

```text
src/lib/siteConfig.ts
```

The current public links are:

```ts
instagramUrl: "https://www.instagram.com/abituriyentbirliyi/",
whatsappUrl: "https://chat.whatsapp.com/EbOAbI1r3VRGeXNoS4hTSO",
```

If these links change later, update them only in `src/lib/siteConfig.ts`.

## 10. Run Locally

From the project folder:

```bash
export PATH=/home/osman/.local/node-v22.19.0-linux-x64/bin:$PATH
cd /home/osman/ab-website
npm install
npm run dev
```

Then open the local URL shown in the terminal.

## 11. Build `dist/`

```bash
export PATH=/home/osman/.local/node-v22.19.0-linux-x64/bin:$PATH
cd /home/osman/ab-website
npm run build
```

The finished static website is generated in:

```text
/home/osman/ab-website/dist/
```

The contents of `dist/` can be copied to a normal static web server such as Nginx.

Node.js is needed only for building. Node.js does not need to run in production.
