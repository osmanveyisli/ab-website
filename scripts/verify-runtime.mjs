import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:4321").replace(/\/$/, "");
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
];
const canonicalCategories = [
  "STEM", "Competition", "Olympiad", "Scholarship", "Internship", "Research", "Hackathon",
  "Entrepreneurship", "Debate", "Essay", "University", "Exchange", "Program", "Event",
  "Space", "Technology", "Other",
];
const copy = {
  az: {
    home: /Azərbaycanlı şagirdlər üçün imkanları/i,
    opportunities: "İmkanlar",
    news: "Xəbərlər",
    materials: "Tezliklə.",
    about: "AB — Abituriyent Birliyi",
    navigation: "Əsas naviqasiya",
    closingSoon: "Son günlər",
    expired: "Müddəti bitib",
  },
  en: {
    home: /Find opportunities for Azerbaijani students/i,
    opportunities: "Opportunities",
    news: "News",
    materials: "Coming soon.",
    about: "AB — Abituriyent Birliyi",
    navigation: "Main navigation",
    closingSoon: "Closing soon",
    expired: "Expired",
  },
};

const opportunities = JSON.parse(await readFile(new URL("../src/data/opportunities.json", import.meta.url), "utf8"));
const news = JSON.parse(await readFile(new URL("../src/data/news.json", import.meta.url), "utf8"));
const browserErrors = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function shiftedCalendarDate(dateOnly, offset) {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(year, month - 1, day + offset, 12).getTime();
}

async function assertNoOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert(!overflow, `${label}: page has horizontal overflow`);
}

async function assertImagesLoad(page, label) {
  const failures = await page.locator("img").evaluateAll((images) => images
    .filter((image) => image.getClientRects().length > 0 && image.naturalWidth === 0)
    .map((image) => image.getAttribute("src")));
  assert(failures.length === 0, `${label}: unloaded visible images: ${failures.join(", ")}`);
}

async function goto(page, path) {
  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  assert(response?.ok(), `${path} returned ${response?.status()}`);
}

async function createPage(browser, viewport, fixedTime) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (error) => browserErrors.push(`${viewport.name}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("/_vercel/insights/")) {
      browserErrors.push(`${viewport.name}: ${message.text()}`);
    }
  });
  if (fixedTime) {
    await page.addInitScript((time) => {
      const NativeDate = Date;
      class BrowserDate extends NativeDate {
        constructor(...args) {
          super(...(args.length ? args : [time]));
        }

        static now() {
          return time;
        }
      }
      window.Date = BrowserDate;
    }, fixedTime);
  }
  return page;
}

async function verifyRootRedirect(page) {
  const response = await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  assert(response?.ok(), `root redirect target returned ${response?.status()}`);
  assert(new URL(page.url()).pathname === "/az/", `root should redirect to /az/, got ${page.url()}`);
}

async function verifyRoutesAndNavigation(page, lang) {
  const language = copy[lang];
  await goto(page, `/${lang}/`);
  await page.getByRole("heading", { name: language.home }).first().waitFor();
  await assertNoOverflow(page, `${lang}: homepage`);

  const routes = [
    ["opportunities", language.opportunities],
    ["news", language.news],
    ["materials", language.materials],
    ["about", language.about],
  ];
  for (const [route, heading] of routes) {
    await goto(page, `/${lang}/`);
    const navName = heading === language.about ? (lang === "az" ? "Haqqımızda" : "About") : heading;
    await page.getByRole("navigation", { name: language.navigation }).getByRole("link", { name: navName }).click();
    await page.waitForURL(`${baseUrl}/${lang}/${route}/`);
    await page.getByRole("heading", { name: heading }).first().waitFor();
    await assertNoOverflow(page, `${lang}: ${route}`);
  }
}

async function verifyLanguageSwitching(page) {
  const opportunity = opportunities[0];
  const article = news[0];
  await goto(page, `/az/opportunities/${opportunity.slug}/`);
  await page.getByRole("navigation", { name: copy.az.navigation }).getByRole("link", { name: "EN" }).click();
  await page.waitForURL(`${baseUrl}/en/opportunities/${opportunity.slug}/`);

  await goto(page, `/en/news/${article.slug}/`);
  await page.getByRole("navigation", { name: copy.en.navigation }).getByRole("link", { name: "AZ" }).click();
  await page.waitForURL(`${baseUrl}/az/news/${article.slug}/`);
}

async function verifyCategoriesAndSearch(page, lang) {
    await goto(page, `/${lang}/opportunities/`);
  const optionValues = await page.locator('select[name="category"] option').evaluateAll((options) => options.slice(1).map((option) => option.value));
  assert(JSON.stringify(optionValues) === JSON.stringify(canonicalCategories), `${lang}: category dropdown differs from canonical taxonomy`);

  const searchable = opportunities.find((opportunity) => opportunity.title[lang]?.trim());
  assert(searchable, "opportunity data must include a localized title");
  await page.locator('select[name="status"]').selectOption("all");
  await page.locator('input[name="search"]').fill(searchable.title[lang]);
  const matchingCards = page.locator(`[data-opportunity-card][data-search*="${searchable.title[lang].slice(0, 12)}" i]:visible`);
  assert((await matchingCards.count()) > 0, `${lang}: a title search should match its opportunity`);
  await page.locator('input[name="search"]').fill("");

  const categorized = opportunities.find((opportunity) => opportunity.categories.length > 0);
  await page.locator('select[name="category"]').selectOption(categorized.categories[0]);
  const wrongCategoryVisible = await page.locator('[data-opportunity-card]:visible').evaluateAll((cards, category) => cards.some((card) => !card.dataset.categories?.split("|").includes(category)), categorized.categories[0]);
  assert(!wrongCategoryVisible, `${lang}: category filtering showed an unrelated category`);
}

async function verifyStatusFiltering(browser, viewport, lang) {
  const dated = opportunities.find((opportunity) => opportunity.deadline);
  assert(dated?.deadline, "runtime verification requires at least one dated opportunity");

  const closingPage = await createPage(browser, viewport, shiftedCalendarDate(dated.deadline, -7));
  try {
    await goto(closingPage, `/${lang}/opportunities/`);
    await closingPage.locator('select[name="status"]').selectOption("closing-soon");
    const closingCard = closingPage.locator(`[data-opportunity-card][data-deadline="${dated.deadline}"]:visible`);
    await closingCard.first().waitFor();
    await closingCard.getByText(copy[lang].closingSoon, { exact: true }).waitFor();
    const otherStatuses = await closingPage.locator('[data-opportunity-card]:visible').evaluateAll((cards) => cards.some((card) => card.dataset.status !== "closing-soon"));
    assert(!otherStatuses, `${lang}: closing-soon filter showed a different status`);
    await assertNoOverflow(closingPage, `${lang}: closing-soon archive`);
  } finally {
    await closingPage.close();
  }

  const archivePage = await createPage(browser, viewport, shiftedCalendarDate(dated.deadline, 1));
  try {
    await goto(archivePage, `/${lang}/opportunities/`);
    const candidate = archivePage.locator(`[data-opportunity-card][data-deadline="${dated.deadline}"]`);
    assert((await candidate.evaluate((card) => getComputedStyle(card).display)) === "none", `${lang}: expired opportunities should be hidden by default`);
    await archivePage.locator('select[name="status"]').selectOption("expired");
    await candidate.waitFor();
    await candidate.getByText(copy[lang].expired, { exact: true }).waitFor();
    await assertNoOverflow(archivePage, `${lang}: expired archive`);
  } finally {
    await archivePage.close();
  }
}

async function verifyDetailAndAnalytics(browser, viewport, lang) {
  const opportunity = opportunities.find((item) => item.officialUrl && item.deadline) || opportunities.find((item) => item.officialUrl);
  assert(opportunity, "opportunity data must include an official source URL");
  const page = await createPage(browser, viewport, shiftedCalendarDate(opportunity.deadline || "2026-01-01", 0));
  try {
    await page.addInitScript(() => {
      window.__abAnalyticsEvents = [];
      window.va = (...args) => window.__abAnalyticsEvents.push(args);
    });
    await goto(page, `/${lang}/opportunities/${opportunity.slug}/`);
    await page.getByRole("heading", { name: opportunity.title[lang] }).first().waitFor();
    await assertImagesLoad(page, `${lang}: opportunity detail`);
    await assertNoOverflow(page, `${lang}: opportunity detail`);
    const officialLinks = page.locator("[data-official-opportunity-link]");
    assert((await officialLinks.count()) === 2, `${lang}: detail page should have inline and sidebar official CTAs`);
    const inlineCta = page.locator(".detail-source-inline [data-official-opportunity-link]");
    const sidebarCta = page.locator(".detail-sidebar [data-official-opportunity-link]");
    assert(await inlineCta.isVisible(), `${lang}: inline official CTA should be visible`);
    const sidebarVisible = await sidebarCta.isVisible();
    assert(
      sidebarVisible === (viewport.name !== "mobile"),
      `${lang}/${viewport.name}: sidebar CTA visibility does not match the responsive layout`,
    );

    const visibleOfficialLinks = page.locator("[data-official-opportunity-link]:visible");
    const expectedVisibleCtas = sidebarVisible ? 2 : 1;
    assert(
      (await visibleOfficialLinks.count()) === expectedVisibleCtas,
      `${lang}/${viewport.name}: expected ${expectedVisibleCtas} visible official CTA${expectedVisibleCtas === 1 ? "" : "s"}`,
    );

    for (let index = 0; index < expectedVisibleCtas; index += 1) {
      const eventCountBeforeClick = await page.evaluate(() => window.__abAnalyticsEvents.length);
      const popupPromise = page.waitForEvent("popup");
      await visibleOfficialLinks.nth(index).click();
      const popup = await popupPromise;
      await popup.close();
      assert(
        (await page.evaluate(() => window.__abAnalyticsEvents.length)) === eventCountBeforeClick + 1,
        `${lang}/${viewport.name}: each visible official CTA click should emit exactly one analytics event`,
      );
    }
    const events = await page.evaluate(() => window.__abAnalyticsEvents);
    assert(events.length === expectedVisibleCtas, `${lang}/${viewport.name}: official CTA event count is incorrect`);
    for (const event of events) {
      const payload = event[1];
      assert(event[0] === "event" && payload?.name === "opportunity_official_click", `${lang}: incorrect official CTA event name`);
      assert(payload.data?.slug === opportunity.slug && payload.data?.language === lang, `${lang}: official CTA event properties are incorrect`);
    }
  } finally {
    await page.close();
  }
}

async function verifyAllOpportunityDetails(page, lang) {
  for (const opportunity of opportunities) {
    await goto(page, `/${lang}/opportunities/${opportunity.slug}/`);
    await page.getByRole("heading", { name: opportunity.title[lang] }).first().waitFor();
  }
}

async function verifyFeaturedStatus(browser, viewport, lang) {
  const featured = opportunities.find((opportunity) => opportunity.featured && opportunity.deadline);
  if (!featured) return;

  const closingPage = await createPage(browser, viewport, shiftedCalendarDate(featured.deadline, -7));
  try {
    await goto(closingPage, `/${lang}/`);
    await closingPage.locator("[data-featured-opportunity]").getByText(copy[lang].closingSoon, { exact: true }).waitFor();
  } finally {
    await closingPage.close();
  }

  const expiredPage = await createPage(browser, viewport, shiftedCalendarDate(featured.deadline, 1));
  try {
    await goto(expiredPage, `/${lang}/`);
    assert((await expiredPage.locator("[data-featured-section]").count()) === 1, `${lang}: featured section should be present in markup`);
    assert(await expiredPage.locator("[data-featured-section]").evaluate((section) => section.hidden), `${lang}: expired featured opportunity should be hidden on the homepage`);
  } finally {
    await expiredPage.close();
  }
}

async function verifySeoAnalyticsAndLinks(page, lang) {
  await goto(page, `/${lang}/opportunities/`);
  assert((await page.locator('link[rel="canonical"]').count()) === 1, `${lang}: canonical link missing`);
  assert((await page.locator('link[rel="alternate"][hreflang="az"]').count()) === 1, `${lang}: Azerbaijani hreflang missing`);
  assert((await page.locator('link[rel="alternate"][hreflang="en"]').count()) === 1, `${lang}: English hreflang missing`);
  assert((await page.locator('meta[name="description"]').count()) === 1, `${lang}: description meta missing`);
  assert((await page.locator('script[src*="_vercel/insights"]').count()) >= 1, `${lang}: Vercel Analytics script missing`);

  await goto(page, `/${lang}/`);
  const links = await page.locator('a[href^="/"]').evaluateAll((anchors) => [...new Set(anchors.map((anchor) => anchor.getAttribute("href")))]);
  for (const href of links) {
    const response = await page.request.get(`${baseUrl}${href}`);
    assert(response.status() < 400, `${lang}: broken internal link ${href}`);
  }
}

async function run() {
  const dataCategories = JSON.parse(await readFile(new URL("../src/data/categories.json", import.meta.url), "utf8"));
  assert(JSON.stringify(dataCategories) === JSON.stringify(canonicalCategories), "categories.json must contain exactly the canonical taxonomy");
  for (const opportunity of opportunities) {
    assert(opportunity.categories.every((category) => canonicalCategories.includes(category)), `${opportunity.slug}: non-canonical category found`);
    assert(/^https:\/\//.test(opportunity.officialUrl), `${opportunity.slug}: official source URL is missing or invalid`);
  }

  const browser = await chromium.launch();
  try {
    for (const viewport of viewports) {
      const page = await createPage(browser, viewport);

      await verifyRootRedirect(page);
      for (const lang of Object.keys(copy)) {
        await verifyRoutesAndNavigation(page, lang);
        await verifyCategoriesAndSearch(page, lang);
        await verifySeoAnalyticsAndLinks(page, lang);
        await verifyStatusFiltering(browser, viewport, lang);
        await verifyDetailAndAnalytics(browser, viewport, lang);
        await verifyFeaturedStatus(browser, viewport, lang);
        if (viewport.name === "desktop") await verifyAllOpportunityDetails(page, lang);
        await goto(page, `/${lang}/about/`);
        await assertImagesLoad(page, `${lang}: about page`);
        await assertNoOverflow(page, `${viewport.name}/${lang}`);
      }
      await verifyLanguageSwitching(page);
      await page.close();
    }
    assert(browserErrors.length === 0, `Browser errors found:\n${browserErrors.join("\n")}`);
    console.log(`Runtime verification passed for AZ/EN on ${viewports.map(({ name }) => name).join(", ")}.`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
