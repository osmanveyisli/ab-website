import type { Lang, OpportunityStatus } from "./types";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

/**
 * Compares date-only values as calendar dates. It deliberately avoids parsing
 * YYYY-MM-DD as UTC, so a visitor's timezone cannot shift a deadline by a day.
 */
export function getOpportunityStatus(
  deadline: string | null | undefined,
  referenceDate = new Date(),
): OpportunityStatus {
  if (!deadline) return "no-deadline";

  const { year, month, day } = parseDateOnly(deadline);
  const deadlineDay = Date.UTC(year, month - 1, day);
  const todayDay = Date.UTC(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  const daysUntilDeadline = Math.round((deadlineDay - todayDay) / DAY_IN_MS);

  if (daysUntilDeadline < 0) return "expired";
  if (daysUntilDeadline <= 7) return "closing-soon";
  return "open";
}

const statusLabels: Record<Lang, Record<OpportunityStatus, string>> = {
  az: {
    open: "Açıqdır",
    "closing-soon": "Son günlər",
    expired: "Müddəti bitib",
    "no-deadline": "Sabit son tarix yoxdur",
  },
  en: {
    open: "Open",
    "closing-soon": "Closing soon",
    expired: "Expired",
    "no-deadline": "No fixed deadline",
  },
};

export function opportunityStatusLabel(status: OpportunityStatus, lang: Lang) {
  return statusLabels[lang][status];
}

/** Applies the browser's local-calendar status to every rendered status badge. */
export function updateOpportunityStatusElements(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-status-deadline]").forEach((badge) => {
    const status = getOpportunityStatus(badge.dataset.statusDeadline);
    const lang = badge.dataset.statusLang === "en" ? "en" : "az";
    badge.textContent = opportunityStatusLabel(status, lang);
    badge.className = `status-badge status-${status}`;
  });
}
