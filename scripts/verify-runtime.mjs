import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4321";
const siteIdentity = "AB — Abituriyentlər Birliyi";
const instagramUrl = "https://www.instagram.com/abituriyentbirliyi/";
const whatsappUrl = "https://chat.whatsapp.com/EbOAbI1r3VRGeXNoS4hTSO";
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
];

const languages = {
  az: {
    homeHeading: /Azərbaycanlı şagirdlər üçün imkanları/i,
    opportunities: "İmkanlar",
    news: "Xəbərlər",
    materials: "Tezliklə.",
    about: "AB — Abituriyentlər Birliyi",
    searchTerm: "kosmik",
    categoryLabel: "Kateqoriya",
    statusLabel: "Status",
    scholarshipValue: "Scholarship",
    closingSoonLabel: "Son günlər",
    lastVerified: "Son dəfə yoxlanılıb",
    noDeadline: "Sabit son tarix yoxdur",
    navName: "Əsas naviqasiya",
    whatsapp: "WhatsApp icması",
    opportunitiesEyebrow: "Aktiv imkanlar",
    newsEyebrow: "Son xəbərlər",
    socialTitle: "AB icmasına qoşul",
    homeTitle: `Ana səhifə | ${siteIdentity}`,
    opportunitiesTitle: `İmkanlar | ${siteIdentity}`,
    newsTitle: `Xəbərlər | ${siteIdentity}`,
    materialsTitle: `Materiallar | ${siteIdentity}`,
    aboutTitle: `Haqqımızda | ${siteIdentity}`,
  },
  en: {
    homeHeading: /Find opportunities for Azerbaijani students/i,
    opportunities: "Opportunities",
    news: "News",
    materials: "Coming soon.",
    about: "AB — Abituriyentlər Birliyi",
    searchTerm: "space apps",
    categoryLabel: "Category",
    statusLabel: "Status",
    scholarshipValue: "Scholarship",
    closingSoonLabel: "Closing soon",
    lastVerified: "Last verified",
    noDeadline: "No fixed deadline",
    navName: "Main navigation",
    whatsapp: "WhatsApp community",
    opportunitiesEyebrow: "Active opportunities",
    newsEyebrow: "Latest news",
    socialTitle: "Join the AB community",
    homeTitle: `Home | ${siteIdentity}`,
    opportunitiesTitle: `Opportunities | ${siteIdentity}`,
    newsTitle: `News | ${siteIdentity}`,
    materialsTitle: `Materials | ${siteIdentity}`,
    aboutTitle: `About | ${siteIdentity}`,
  },
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function visibleCount(page, selector) {
  return page.locator(selector).evaluateAll((nodes) =>
    nodes.filter((node) => {
      const style = window.getComputedStyle(node);
      return style.display !== "none" && style.visibility !== "hidden";
    }).length,
  );
}

async function assertImageLoaded(page, selector, message) {
  const image = page.locator(selector).first();
  await image.waitFor();
  const loaded = await image.evaluate((node) => node instanceof HTMLImageElement && node.naturalWidth > 0);
  assert(loaded, message);
}

async function assertApproxAspectRatio(page, selector, expectedRatio, message) {
  const ratio = await page.locator(selector).first().evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width / rect.height;
  });
  assert(Math.abs(ratio - expectedRatio) < 0.04, `${message}: expected ~${expectedRatio}, got ${ratio.toFixed(2)}`);
}

async function verifyRoute(page, path, expectedHeading) {
  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  assert(response?.ok(), `${path} returned ${response?.status()}`);
  await page.getByRole("heading", { name: expectedHeading }).first().waitFor();
}

async function verifyLogoImages(page, lang) {
  const headerLogo = page.locator(".brand-logo").first();
  await headerLogo.waitFor();
  const headerLogoLoaded = await headerLogo.evaluate((image) => image instanceof HTMLImageElement && image.naturalWidth > 0);
  assert(headerLogoLoaded, `${lang}: header logo did not load`);

  await page.goto(`${baseUrl}/${lang}/about/`, { waitUntil: "networkidle" });
  const aboutLogo = page.locator(".about-logo").first();
  await aboutLogo.waitFor();
  const aboutLogoLoaded = await aboutLogo.evaluate((image) => image instanceof HTMLImageElement && image.naturalWidth > 0);
  assert(aboutLogoLoaded, `${lang}: about logo did not load`);
}

async function verifyBranding(page, lang) {
  await page.goto(`${baseUrl}/${lang}/`, { waitUntil: "networkidle" });
  const header = page.locator(".site-header");
  await header.getByText("AB", { exact: true }).waitFor();
  await header.getByText("Abituriyentlər Birliyi", { exact: true }).waitFor();

  const footer = page.locator(".site-footer");
  await footer.getByText("AB — Abituriyentlər Birliyi", { exact: true }).waitFor();
  await footer.getByText("© 2026 AB — Abituriyentlər Birliyi", { exact: true }).waitFor();
}

async function verifyMainNavigation(page, lang) {
  const copy = languages[lang];
  const navTargets = [
    { name: copy.opportunities, path: `/${lang}/opportunities/`, heading: copy.opportunities },
    { name: copy.news, path: `/${lang}/news/`, heading: copy.news },
    { name: "Materials" in copy ? copy.materials : copy.materials, path: `/${lang}/materials/`, heading: copy.materials },
    { name: copy.about.includes("AB") ? (lang === "az" ? "Haqqımızda" : "About") : copy.about, path: `/${lang}/about/`, heading: copy.about },
  ];

  for (const target of navTargets) {
    await page.goto(`${baseUrl}/${lang}/`, { waitUntil: "networkidle" });
    const nav = page.getByRole("navigation", { name: copy.navName });
    if (target.path.includes("/materials/")) {
      await nav.getByRole("link", { name: lang === "az" ? "Materiallar" : "Materials" }).click();
    } else if (target.path.includes("/about/")) {
      await nav.getByRole("link", { name: lang === "az" ? "Haqqımızda" : "About" }).click();
    } else {
      await nav.getByRole("link", { name: target.name }).click();
    }
    await page.waitForURL(`${baseUrl}${target.path}`);
    await page.getByRole("heading", { name: target.heading }).first().waitFor();
  }
}

async function verifyLanguageSwitch(page) {
  await page.goto(`${baseUrl}/az/opportunities/`, { waitUntil: "networkidle" });
  await page.getByRole("navigation", { name: languages.az.navName }).getByRole("link", { name: "EN" }).click();
  await page.waitForURL(`${baseUrl}/en/opportunities/`);
  await page.getByRole("heading", { name: "Opportunities" }).first().waitFor();

  await page.goto(`${baseUrl}/az/opportunities/demo-stem-research-bootcamp/`, { waitUntil: "networkidle" });
  await page.getByRole("navigation", { name: languages.az.navName }).getByRole("link", { name: "EN" }).click();
  await page.waitForURL(`${baseUrl}/en/opportunities/demo-stem-research-bootcamp/`);
  await page.getByText("Last verified").waitFor();

  await page.goto(`${baseUrl}/en/news/demo-application-calendar-reminder/`, { waitUntil: "networkidle" });
  await page.getByRole("navigation", { name: languages.en.navName }).getByRole("link", { name: "AZ" }).click();
  await page.waitForURL(`${baseUrl}/az/news/demo-application-calendar-reminder/`);
  await page.getByRole("heading", { name: /\[Demo\] Application Calendar Reminder/ }).first().waitFor();
}

async function verifyOpportunities(page, lang) {
  const copy = languages[lang];
  await page.goto(`${baseUrl}/${lang}/opportunities/`, { waitUntil: "networkidle" });

  assert((await visibleCount(page, "[data-opportunity-card]")) === 5, `${lang}: default active opportunity count should be 5`);
  assert((await page.locator(".opportunity-card .status-badge:visible").count()) === 0, `${lang}: active opportunity cards should not show status badges`);
  await page.locator(".opportunity-card .deadline-summary", { hasText: copy.noDeadline }).first().waitFor();
  await assertImageLoaded(page, 'img[src="/images/nasa-space-apps-2026.png"]', `${lang}: NASA opportunity card image did not load`);
  assert(
    (await page.locator('img[src="/images/nasa-space-apps-2026.png"]').first().evaluate((image) => getComputedStyle(image).objectPosition)) === "50% 0%",
    `${lang}: NASA opportunity card image should use top focal position`,
  );

  const breakthroughCard = page.locator(".opportunity-card", { hasText: "Breakthrough Junior Challenge 2026" }).first();
  await breakthroughCard.waitFor();
  const breakthroughCardImage = breakthroughCard.locator('img[src="/images/breakthrough-junior-challenge-2026.png"]');
  if ((await breakthroughCardImage.count()) > 0) {
    await assertImageLoaded(page, '.opportunity-card img[src="/images/breakthrough-junior-challenge-2026.png"]', `${lang}: Breakthrough card image did not load`);
  } else {
    await breakthroughCard.locator(".card-image-placeholder").waitFor();
  }

  await page.locator('input[name="search"]').fill(copy.searchTerm);
  assert((await visibleCount(page, "[data-opportunity-card]")) === 1, `${lang}: localized search should return 1`);
  await page.locator('input[name="search"]').fill("");
  await page.locator('select[name="category"]').selectOption(copy.scholarshipValue);
  assert((await visibleCount(page, "[data-opportunity-card]")) === 2, `${lang}: Scholarship filter should return 2`);
  await page.locator('select[name="category"]').selectOption("");
  await page.locator('select[name="status"]').selectOption("closing-soon");
  assert((await visibleCount(page, "[data-opportunity-card]")) === 1, `${lang}: closing-soon filter should return 1`);
  assert((await page.locator(".opportunity-card .status-badge:visible").count()) === 0, `${lang}: closing-soon cards should not show status badges`);
  await page.locator('select[name="status"]').selectOption("expired");
  assert((await visibleCount(page, "[data-opportunity-card]")) === 1, `${lang}: expired archive filter should return 1`);
  assert((await page.locator(".opportunity-card .status-badge:visible").count()) === 1, `${lang}: expired card should show one visible warning badge`);

  await page.goto(`${baseUrl}/${lang}/opportunities/demo-stem-research-bootcamp/`, { waitUntil: "networkidle" });
  await page.getByText(copy.lastVerified).waitFor();
  await page
    .locator(".detail-source-inline a:visible, .detail-sidebar a:visible, .detail-source-inline .source-missing:visible, .detail-sidebar .source-missing:visible")
    .first()
    .waitFor();

  await page.goto(`${baseUrl}/${lang}/opportunities/demo-student-hackathon/`, { waitUntil: "networkidle" });
  await page.locator(".detail-keyfacts", { hasText: copy.noDeadline }).waitFor();

  await page.goto(`${baseUrl}/${lang}/opportunities/nasa-space-apps-2026/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "NASA Space Apps 2026" }).first().waitFor();
  await page.locator(".detail-keyfacts", { hasText: copy.noDeadline }).waitFor();
  await page.getByText(copy.lastVerified).waitFor();
  await page.getByRole("link", { name: lang === "az" ? "Rəsmi mənbəyə keç" : "Visit official source" }).first().waitFor();
  await assertImageLoaded(page, '.detail-hero-image[src="/images/nasa-space-apps-2026.png"]', `${lang}: NASA opportunity detail image did not load`);
  await assertApproxAspectRatio(
    page,
    '.detail-hero-image[src="/images/nasa-space-apps-2026.png"]',
    16 / 9,
    `${lang}: NASA opportunity detail image should render at the detail hero ratio`,
  );
  assert(
    (await page.locator('.detail-hero-image[src="/images/nasa-space-apps-2026.png"]').first().evaluate((image) => getComputedStyle(image).objectPosition)) === "50% 0%",
    `${lang}: NASA opportunity detail image should use top focal position`,
  );

  await page.goto(`${baseUrl}/${lang}/opportunities/breakthrough-junior-challenge-2026/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Breakthrough Junior Challenge 2026" }).first().waitFor();
  await page.getByText(lang === "az" ? "13-18 yaşlı şagirdlər" : "Students aged 13-18").first().waitFor();
  await page.getByRole("link", { name: lang === "az" ? "Rəsmi müraciət səhifəsinə keç ↗" : "Visit official application page ↗" }).first().waitFor();
  const breakthroughDetailImage = page.locator('.detail-hero-image[src="/images/breakthrough-junior-challenge-2026.png"]');
  if ((await breakthroughDetailImage.count()) > 0) {
    await assertImageLoaded(page, '.detail-hero-image[src="/images/breakthrough-junior-challenge-2026.png"]', `${lang}: Breakthrough detail image did not load`);
  }
}

async function verifyNews(page, lang) {
  const copy = languages[lang];
  await page.goto(`${baseUrl}/${lang}/news/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: copy.news }).first().waitFor();
  await page.getByText(copy.newsEyebrow).first().waitFor();
  assert((await page.locator('input[type="search"]').count()) === 0, `${lang}: News search input should be removed`);
  assert((await visibleCount(page, "[data-news-card]")) === 2, `${lang}: news page should show 2 cards`);
}

async function verifySmallCopyAndHomepageLinks(page, lang) {
  const copy = languages[lang];
  await page.goto(`${baseUrl}/${lang}/opportunities/`, { waitUntil: "networkidle" });
  await page.getByText(copy.opportunitiesEyebrow).first().waitFor();

  await page.goto(`${baseUrl}/${lang}/about/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: copy.socialTitle }).waitFor();

  await page.goto(`${baseUrl}/${lang}/`, { waitUntil: "networkidle" });
  assert((await page.locator(".hero-panel").count()) === 0, `${lang}: removed homepage shortcut panel should not render`);
  assert((await page.locator(".notice").count()) === 0, `${lang}: homepage demo notice should not render`);
  assert((await page.locator(".featured-primary").count()) <= 1, `${lang}: homepage should render at most one primary featured item`);
  await page.getByRole("heading", { name: "NASA Space Apps 2026" }).first().waitFor();
  await assertImageLoaded(page, '.featured-media img[src="/images/nasa-space-apps-2026.png"]', `${lang}: homepage featured NASA image did not load`);
  assert(
    (await page.locator('.featured-media img[src="/images/nasa-space-apps-2026.png"]').first().evaluate((image) => getComputedStyle(image).objectPosition)) === "50% 0%",
    `${lang}: homepage featured NASA image should use top focal position`,
  );
  await page.locator(".card-grid .opportunity-card", { hasText: "Breakthrough Junior Challenge 2026" }).first().waitFor();
  assert((await page.locator(".card-grid .opportunity-card", { hasText: "NASA Space Apps 2026" }).count()) === 0, `${lang}: featured opportunity should not duplicate in Latest`);
  await page.locator(".home-news-main").first().waitFor();
}

async function verifySeo(page, lang, path) {
  await page.goto(`${baseUrl}/${lang}${path}`, { waitUntil: "networkidle" });
  const htmlLang = await page.locator("html").getAttribute("lang");
  assert(htmlLang === lang, `${lang}${path}: html lang should be ${lang}`);
  assert((await page.locator('link[rel="canonical"]').count()) === 1, `${lang}${path}: canonical missing`);
  assert((await page.locator('link[rel="alternate"][hreflang="az"]').count()) === 1, `${lang}${path}: az hreflang missing`);
  assert((await page.locator('link[rel="alternate"][hreflang="en"]').count()) === 1, `${lang}${path}: en hreflang missing`);
}

async function verifyPageTitles(page, lang) {
  const copy = languages[lang];
  const routes = [
    [`/${lang}/`, copy.homeTitle],
    [`/${lang}/opportunities/`, copy.opportunitiesTitle],
    [`/${lang}/news/`, copy.newsTitle],
    [`/${lang}/materials/`, copy.materialsTitle],
    [`/${lang}/about/`, copy.aboutTitle],
    [`/${lang}/opportunities/nasa-space-apps-2026/`, `NASA Space Apps 2026 | ${siteIdentity}`],
    [`/${lang}/opportunities/breakthrough-junior-challenge-2026/`, `Breakthrough Junior Challenge 2026 | ${siteIdentity}`],
    [`/${lang}/opportunities/demo-stem-research-bootcamp/`, `[Demo] STEM Research Bootcamp | ${siteIdentity}`],
    [`/${lang}/news/demo-exam-update/`, `[Demo] Important Exam Update Format | ${siteIdentity}`],
  ];

  for (const [path, expectedTitle] of routes) {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    assert((await page.title()) === expectedTitle, `${path}: expected title "${expectedTitle}", got "${await page.title()}"`);
  }
}

async function verifyInternalLinks(page, lang) {
  await page.goto(`${baseUrl}/${lang}/`, { waitUntil: "networkidle" });
  const links = await page.locator("a[href]").evaluateAll((anchors) =>
    [...new Set(anchors.map((anchor) => anchor.getAttribute("href")).filter(Boolean))]
      .filter((href) => href.startsWith("/") && !href.startsWith("//")),
  );

  for (const href of links) {
    const response = await page.request.get(`${baseUrl}${href}`);
    assert(response.status() < 400, `${lang}: broken internal link ${href} returned ${response.status()}`);
  }
}

async function verifySocialConfig() {
  const config = await readFile(new URL("../src/lib/siteConfig.ts", import.meta.url), "utf8");
  assert(config.includes(`instagramUrl: "${instagramUrl}"`), "siteConfig.ts should contain the real Instagram URL");
  assert(config.includes(`whatsappUrl: "${whatsappUrl}"`), "siteConfig.ts should contain the real WhatsApp URL");
}

async function verifySocialLinks(page, lang) {
  await page.goto(`${baseUrl}/${lang}/about/`, { waitUntil: "networkidle" });
  const emptySocialLinks = await page.locator('a[href=""]').count();
  assert(emptySocialLinks === 0, `${lang}: empty social href should not render`);
  await page.getByRole("link", { name: "Instagram" }).first().waitFor();
  await page.getByRole("link", { name: languages[lang].whatsapp }).first().waitFor();
  assert((await page.getByRole("link", { name: "Instagram" }).first().getAttribute("href")) === instagramUrl, `${lang}: Instagram URL mismatch`);
  assert((await page.getByRole("link", { name: languages[lang].whatsapp }).first().getAttribute("href")) === whatsappUrl, `${lang}: WhatsApp URL mismatch`);
  assert((await page.getByRole("link", { name: "Instagram" }).first().getAttribute("rel")) === "noopener noreferrer", `${lang}: Instagram rel missing`);
  assert((await page.getByRole("link", { name: languages[lang].whatsapp }).first().getAttribute("rel")) === "noopener noreferrer", `${lang}: WhatsApp rel missing`);

  await page.goto(`${baseUrl}/${lang}/`, { waitUntil: "networkidle" });
  await page.locator(".site-footer").getByRole("link", { name: "Instagram" }).waitFor();
  await page.locator(".site-footer").getByRole("link", { name: languages[lang].whatsapp }).waitFor();
}

async function verifyPublicCopy(page, lang) {
  await page.goto(`${baseUrl}/${lang}/about/`, { waitUntil: "networkidle" });
  const aboutText = await page.locator("main").innerText();
  for (const forbidden of ["JSON", "Astro", "static website", "frontend", "backend", "build", "rebuilt"]) {
    assert(!aboutText.includes(forbidden), `${lang}: About page contains implementation wording: ${forbidden}`);
  }
  assert(!aboutText.includes("Link to be added"), `${lang}: About page still contains social placeholder text`);
  assert(!aboutText.includes("Link tezliklə"), `${lang}: About page still contains social placeholder text`);
}

async function run() {
  await verifySocialConfig();

  const browser = await chromium.launch();
  const errors = [];

  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      page.on("pageerror", (error) => errors.push(`${viewport.name}: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(`${viewport.name}: ${message.text()}`);
      });

      await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
      await page.waitForURL(`${baseUrl}/az/`);
      await page.getByRole("heading", { name: languages.az.homeHeading }).first().waitFor();

      for (const lang of Object.keys(languages)) {
        const copy = languages[lang];
        await verifyRoute(page, `/${lang}/`, copy.homeHeading);
        await verifyRoute(page, `/${lang}/opportunities/`, copy.opportunities);
        await verifyRoute(page, `/${lang}/news/`, copy.news);
        await verifyRoute(page, `/${lang}/materials/`, copy.materials);
        await verifyRoute(page, `/${lang}/about/`, copy.about);
        await verifyLogoImages(page, lang);
        await verifyBranding(page, lang);
        await verifyMainNavigation(page, lang);
        await verifyOpportunities(page, lang);
        await verifyNews(page, lang);
        await verifySmallCopyAndHomepageLinks(page, lang);
        await verifySeo(page, lang, "/opportunities/");
        await verifySeo(page, lang, "/opportunities/demo-stem-research-bootcamp/");
        await verifyPageTitles(page, lang);
        await verifyInternalLinks(page, lang);
        await verifySocialLinks(page, lang);
        await verifyPublicCopy(page, lang);
      }

      await verifyLanguageSwitch(page);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      assert(!overflow, `${viewport.name}: page has horizontal overflow`);
      await page.close();
    }

    assert(errors.length === 0, `Browser errors found:\n${errors.join("\n")}`);
    console.log(`Runtime verification passed for AZ/EN on ${viewports.map((viewport) => viewport.name).join(", ")}.`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
