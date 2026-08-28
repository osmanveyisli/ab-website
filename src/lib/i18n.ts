import type { Lang, LocalizedString, OpportunityStatus } from "./types";

export const languages: Lang[] = ["az", "en"];
export const defaultLang: Lang = "az";

export function isLang(value: string | undefined): value is Lang {
  return value === "az" || value === "en";
}

export function otherLang(lang: Lang): Lang {
  return lang === "az" ? "en" : "az";
}

export function localized(value: LocalizedString, lang: Lang) {
  return value[lang] || value.az || value.en;
}

export const categoryLabels: Record<string, LocalizedString> = {
  STEM: { az: "STEM", en: "STEM" },
  Competition: { az: "Müsabiqə", en: "Competition" },
  Olympiad: { az: "Olimpiada", en: "Olympiad" },
  Scholarship: { az: "Təqaüd", en: "Scholarship" },
  Internship: { az: "Təcrübə", en: "Internship" },
  Research: { az: "Tədqiqat", en: "Research" },
  Hackathon: { az: "Hakaton", en: "Hackathon" },
  Space: { az: "Kosmos", en: "Space" },
  Technology: { az: "Texnologiya", en: "Technology" },
  University: { az: "Universitet", en: "University" },
  Exchange: { az: "Mübadilə", en: "Exchange" },
  Event: { az: "Tədbir", en: "Event" },
  Other: { az: "Digər", en: "Other" },
};

export function categoryLabel(category: string, lang: Lang) {
  return localized(categoryLabels[category] || { az: category, en: category }, lang);
}

export const ui = {
  skipToContent: { az: "Məzmuna keç", en: "Skip to content" },
  home: { az: "Ana səhifə", en: "Home" },
  opportunities: { az: "İmkanlar", en: "Opportunities" },
  news: { az: "Xəbərlər", en: "News" },
  materials: { az: "Materiallar", en: "Materials" },
  about: { az: "Haqqımızda", en: "About" },
  mainNavigation: { az: "Əsas naviqasiya", en: "Main navigation" },
  footerNavigation: { az: "Alt naviqasiya", en: "Footer navigation" },
  openMenu: { az: "Menyunu aç", en: "Open menu" },
  closeMenu: { az: "Menyunu bağla", en: "Close menu" },
  language: { az: "Dil", en: "Language" },
  search: { az: "Axtar", en: "Search" },
  category: { az: "Kateqoriya", en: "Category" },
  status: { az: "Status", en: "Status" },
  allCategories: { az: "Bütün kateqoriyalar", en: "All categories" },
  activeOnly: { az: "Yalnız aktivlər", en: "Active only" },
  allStatuses: { az: "Bütün statuslar", en: "All statuses" },
  expiredArchive: { az: "Müddəti bitənlər", en: "Expired archive" },
  deadline: { az: "Son tarix", en: "Deadline" },
  organizer: { az: "Təşkilatçı", en: "Organizer" },
  dateAdded: { az: "Əlavə olunub", en: "Date added" },
  lastVerified: { az: "Son dəfə yoxlanılıb", en: "Last verified" },
  categories: { az: "Kateqoriyalar", en: "Categories" },
  eligibility: { az: "Uyğunluq", en: "Eligibility" },
  eligibilityShort: { az: "Kimlər üçün", en: "Who it is for" },
  description: { az: "Təsvir", en: "Description" },
  abSummary: { az: "AB xülasəsi", en: "AB summary" },
  officialSource: { az: "Rəsmi mənbə", en: "Official source" },
  visitOfficialSource: { az: "Rəsmi mənbəyə keç", en: "Visit official source" },
  originalSource: { az: "Orijinal mənbə", en: "Original source" },
  published: { az: "Dərc olunub", en: "Published" },
  tags: { az: "Etiketlər", en: "Tags" },
  demoContent: { az: "Demo məzmun", en: "Demo content" },
  featured: { az: "Seçilmiş", en: "Featured" },
  viewAll: { az: "Hamısına bax", en: "View all" },
  viewDetails: { az: "Ətraflı", en: "View details" },
  featuredOpportunities: { az: "Seçilmiş imkanlar", en: "Featured opportunities" },
  latestOpportunities: { az: "Yeni imkanlar", en: "Latest opportunities" },
  latestNews: { az: "Son xəbərlər", en: "Latest news" },
  results: { az: "nəticə", en: "results" },
  result: { az: "nəticə", en: "result" },
  noMatches: { az: "Bu filtrlərə uyğun imkan tapılmadı.", en: "No opportunities match the current filters." },
  noFixedDeadline: { az: "Sabit son tarix yoxdur", en: "No fixed deadline" },
  sourceMissing: {
    az: "Bu demo qeyddə rəsmi mənbə linki əlavə edilməyib.",
    en: "Official source URL has not been added to this demo entry.",
  },
  newsSourceMissing: {
    az: "Bu demo xəbərdə orijinal mənbə linki əlavə edilməyib.",
    en: "Original source URL has not been added to this demo entry.",
  },
  instagram: { az: "Instagram", en: "Instagram" },
  whatsapp: { az: "WhatsApp icması", en: "WhatsApp community" },
};

const statusLabels: Record<OpportunityStatus, LocalizedString> = {
  open: { az: "Açıqdır", en: "Open" },
  "closing-soon": { az: "Son günlər", en: "Closing soon" },
  expired: { az: "Müddəti bitib", en: "Expired" },
  "no-deadline": { az: "Sabit son tarix yoxdur", en: "No fixed deadline" },
};

export function statusLabel(status: OpportunityStatus, lang: Lang) {
  return localized(statusLabels[status], lang);
}

export function switchPath(pathname: string, targetLang: Lang) {
  const parts = pathname.split("/");
  if (isLang(parts[1])) {
    parts[1] = targetLang;
    return parts.join("/") || `/${targetLang}/`;
  }
  return `/${targetLang}${pathname === "/" ? "/" : pathname}`;
}
