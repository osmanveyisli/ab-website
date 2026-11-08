import type { Lang, Opportunity } from './types';

type Fact = NonNullable<Opportunity['detailFacts']>[number];
type Milestone = 'generic' | 'application' | 'registration' | 'submission';
const languages: Lang[] = ['az', 'en'];
const months: Record<Lang, string[]> = {
  az: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'],
  en: ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
};

function milestone(fact: Fact): Milestone | undefined {
  // Exact semantic aliases: qualifiers such as early/final/round must remain distinct.
  const aliases: Record<Milestone, string[]> = {
    generic: ['deadline', 'exact deadline', 'son tarix', 'dəqiq son tarix'],
    application: ['application deadline', 'apply by', 'müraciətin son tarixi', 'müraciət son tarixi'],
    registration: ['registration deadline', 'register by', 'qeydiyyatın son tarixi', 'qeydiyyat son tarixi'],
    submission: ['submission deadline', 'submission due', 'təqdimetmə son tarixi', 'təqdimatın son tarixi'],
  };
  for (const lang of ['en', 'az'] as const) {
    const label = fact.label[lang].trim().toLocaleLowerCase(lang).replace(/\s+/g, ' ');
    for (const kind of Object.keys(aliases) as Milestone[]) {
      if (aliases[kind].includes(label)) return kind;
    }
    // A nonempty but unknown English label may carry a meaningful qualifier.
    if (lang === 'en' && label) return undefined;
  }
}

function parseDate(value: string, lang: Lang) {
  const text = value.trim().toLocaleLowerCase(lang);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/);
  const dayFirst = text.match(/^(\d{1,2})\s+([\p{L}]+)\s+(\d{4})(.*)$/u);
  const local = text.match(lang === 'az'
    ? /^(\d{1,2})\s+([\p{L}]+)\s+(\d{4})(.*)$/u
    : /^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})(.*)$/);
  let day: number, month: number, year: number, suffix: string;
  if (iso) {
    [, , , , suffix] = iso;
    year = Number(iso[1]); month = Number(iso[2]); day = Number(iso[3]);
  } else if (dayFirst) {
    year = Number(dayFirst[3]); month = months[lang].indexOf(dayFirst[2]) + 1;
    day = Number(dayFirst[1]); suffix = dayFirst[4];
  } else if (local) {
    year = Number(local[3]);
    month = months[lang].indexOf(local[lang === 'az' ? 2 : 1]) + 1;
    day = Number(local[lang === 'az' ? 1 : 2]);
    suffix = local[4];
  } else return undefined;
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return undefined;
  const precision = suffix.trim().replace(/^,\s*/, '').replace(/^(at|saat)\s+/, '');
  // Only single dates, optionally followed by a time. Ranges and prose stay untouched.
  if (precision && !/^\d{1,2}:\d{2}(?:\s|$)/.test(precision)) return undefined;
  return { date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, precision };
}

function compatible(a: Fact, b: Fact) {
  return languages.every(lang => {
    const first = parseDate(a.value[lang], lang);
    const second = parseDate(b.value[lang], lang);
    return first && second && first.date === second.date &&
      (!first.precision || !second.precision || first.precision === second.precision);
  });
}

function moreInformative(a: Fact, b: Fact): Fact {
  const value = { ...a.value };
  for (const lang of languages) {
    if (!parseDate(a.value[lang], lang)?.precision && parseDate(b.value[lang], lang)?.precision) {
      value[lang] = b.value[lang];
    }
  }
  return { label: milestone(a) === 'generic' ? b.label : a.label, value };
}

/** Resolve the generic deadline against bilingual metadata without changing source data.
 * A generic date can adopt one matching milestone; explicit registration/application/
 * submission milestones never collapse into each other, even on the same date.
 * Unrecognized values and ambiguous matches are preserved rather than guessed.
 */
export function resolveDeadlineFacts(deadline: string | null, detailFacts: Fact[] = []): {
  primaryDeadline: Fact | undefined;
  detailFacts: Fact[];
} {
  const facts: Fact[] = [];
  for (const fact of detailFacts) {
    const kind = milestone(fact);
    const index = kind ? facts.findIndex(other => milestone(other) === kind && compatible(other, fact)) : -1;
    if (index < 0) facts.push(fact);
    else facts[index] = moreInformative(facts[index], fact);
  }
  const candidates = facts.filter(fact => milestone(fact) && languages.every(lang => parseDate(fact.value[lang], lang)?.date === deadline));
  const kinds = new Set(candidates.map(milestone).filter(kind => kind !== 'generic'));
  // Conflicting times or multiple explicit milestones cannot safely replace a generic date.
  if (!deadline || kinds.size > 1 || !candidates.length || !candidates.every(a => candidates.every(b => compatible(a, b)))) {
    return { primaryDeadline: undefined, detailFacts: facts };
  }
  const primaryDeadline = candidates.reduce(moreInformative);
  return { primaryDeadline, detailFacts: facts.filter(fact => !candidates.includes(fact)) };
}
