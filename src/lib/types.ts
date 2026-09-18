export type ContentImage = {
  src: string;
  alt: LocalizedString;
};

export type Lang = "az" | "en";

export type LocalizedString = {
  az: string;
  en: string;
};

export type LocalizedParagraphs = {
  az: string[];
  en: string[];
};

export type LocalizedStringList = {
  az: string[];
  en: string[];
};

export type OpportunityCategory =
  | "STEM"
  | "Competition"
  | "Olympiad"
  | "Scholarship"
  | "Internship"
  | "Research"
  | "Hackathon"
  | "Entrepreneurship"
  | "Debate"
  | "Essay"
  | "University"
  | "Exchange"
  | "Program"
  | "Event"
  | "Space"
  | "Technology"
  | "Other";

export type Opportunity = {
  slug: string;
  title: LocalizedString;
  summary: LocalizedString;
  description: LocalizedParagraphs;
  categories: OpportunityCategory[];
  deadline: string | null;
  imagePosition?: string;
  detailFacts?: {
    label: LocalizedString;
    value: LocalizedString;
  }[];
  eligibilitySummary: LocalizedString;
  eligibility: LocalizedString;
  organizer: string;
  officialUrl: string;
  officialCta?: LocalizedString;
  image: ContentImage | null;
  dateAdded: string;
  lastVerified?: string;
  featured: boolean;
  isDemo?: boolean;
};

export type OpportunityStatus = "open" | "closing-soon" | "expired" | "no-deadline";

export type NewsArticle = {
  slug: string;
  title: LocalizedString;
  summary: LocalizedString;
  body: LocalizedParagraphs;
  publishedDate: string;
  sourceName: string;
  sourceUrl: string;
  image: ContentImage | null;
  imagePosition?: string;
  tags: LocalizedStringList;
  isDemo?: boolean;
};
