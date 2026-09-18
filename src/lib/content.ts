import opportunitiesData from "@data/opportunities.json";
import newsData from "@data/news.json";
import categories from "@data/categories.json";
import { categoryLabel, localized, statusLabel as localizedStatusLabel } from "./i18n";
import type { Lang } from "./types";
import { getOpportunityStatus } from "./opportunityStatus";
import type { NewsArticle, Opportunity, OpportunityStatus } from "./types";

export const opportunities = opportunitiesData as Opportunity[];
export const newsArticles = newsData as NewsArticle[];
const categorySet = new Set<string>(categories);

for (const opportunity of opportunities) {
  for (const category of opportunity.categories) {
    if (!categorySet.has(category)) {
      throw new Error(`Opportunity ${opportunity.slug} uses non-canonical category: ${category}`);
    }
  }
}

function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export { getOpportunityStatus } from "./opportunityStatus";

export function isActiveOpportunity(opportunity: Opportunity, referenceDate = new Date()) {
  return getOpportunityStatus(opportunity.deadline, referenceDate) !== "expired";
}

export function getActiveOpportunities() {
  return opportunities.filter((opportunity) => isActiveOpportunity(opportunity));
}

export function getFeaturedOpportunities() {
  return getActiveOpportunities()
    .filter((opportunity) => opportunity.featured)
    .sort(sortOpportunities)
    .slice(0, 3);
}

export function sortOpportunities(a: Opportunity, b: Opportunity) {
  const statusA = getOpportunityStatus(a.deadline);
  const statusB = getOpportunityStatus(b.deadline);

  if (statusA === "no-deadline" && statusB !== "no-deadline") return 1;
  if (statusB === "no-deadline" && statusA !== "no-deadline") return -1;

  if (a.deadline && b.deadline && a.deadline !== b.deadline) {
    return a.deadline.localeCompare(b.deadline);
  }

  return b.dateAdded.localeCompare(a.dateAdded);
}

export function getNewestOpportunities(limit?: number) {
  const sorted = getActiveOpportunities()
    .filter((opportunity) => !opportunity.featured)
    .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

export function getNewestNews(limit?: number) {
  const sorted = [...newsArticles].sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

export function getOpportunityBySlug(slug: string) {
  return opportunities.find((opportunity) => opportunity.slug === slug);
}

export function getNewsBySlug(slug: string) {
  return newsArticles.find((article) => article.slug === slug);
}

const monthNames: Record<Lang, string[]> = {
  az: [
    "yanvar",
    "fevral",
    "mart",
    "aprel",
    "may",
    "iyun",
    "iyul",
    "avqust",
    "sentyabr",
    "oktyabr",
    "noyabr",
    "dekabr",
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
};

export function formatDate(dateString: string, lang: Lang = "az") {
  const date = parseLocalDate(dateString);
  return `${date.getDate()} ${monthNames[lang][date.getMonth()]} ${date.getFullYear()}`;
}

export function statusLabel(status: OpportunityStatus, lang: Lang = "az") {
  return localizedStatusLabel(status, lang);
}

export function localizedOpportunitySearchText(opportunity: Opportunity, lang: Lang) {
  return [
    localized(opportunity.title, lang),
    localized(opportunity.summary, lang),
    localized(opportunity.eligibilitySummary, lang),
    localized(opportunity.eligibility, lang),
    opportunity.organizer,
    ...(opportunity.detailFacts || []).flatMap((fact) => [
      localized(fact.label, lang),
      localized(fact.value, lang),
    ]),
    ...opportunity.categories,
    ...opportunity.categories.map((category) => categoryLabel(category, lang)),
  ]
    .join(" ")
    .toLocaleLowerCase(lang);
}

export function localizedNewsSearchText(article: NewsArticle, lang: Lang) {
  return [
    localized(article.title, lang),
    localized(article.summary, lang),
    article.sourceName,
    ...article.tags[lang],
  ]
    .join(" ")
    .toLocaleLowerCase(lang);
}
