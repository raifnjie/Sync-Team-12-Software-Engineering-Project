import type { TermSeason } from "../data/catalog";

/**
 * Academic terms. Planning moves through fall and spring only; summer terms
 * can still appear on a student's record.
 */
export interface Term {
  season: TermSeason;
  year: number;
  label: string;
}

export type TermRef = { season: TermSeason; year: number };

export const SEASON_LABEL: Record<TermSeason, string> = { FALL: "Fall", SPRING: "Spring", SUMMER: "Summer" };
const SEASON_ORDER: Record<TermSeason, number> = { SPRING: 0, SUMMER: 1, FALL: 2 };

export function makeTerm(season: TermSeason, year: number): Term {
  return { season, year, label: `${SEASON_LABEL[season]} ${year}` };
}

/** A number that sorts terms chronologically */
export function termIndex(term: TermRef): number {
  return term.year * 3 + SEASON_ORDER[term.season];
}

/** "SPRING-2027": used in URLs and as a stable id */
export function termKey(term: TermRef): string {
  return `${term.season}-${term.year}`;
}

/** The term in session on `today` (Jan–May spring, Jun–Jul summer, Aug–Dec fall) */
export function currentTerm(today: Date): Term {
  const month = today.getMonth(); // 0 = January
  const year = today.getFullYear();
  if (month <= 4) return makeTerm("SPRING", year);
  if (month <= 6) return makeTerm("SUMMER", year);
  return makeTerm("FALL", year);
}

/** The next fall or spring term after `today` (summer is skipped) */
export function nextTerm(today: Date): Term {
  const month = today.getMonth();
  return month <= 7 ? makeTerm("FALL", today.getFullYear()) : makeTerm("SPRING", today.getFullYear() + 1);
}

/** Moves forward `count` fall/spring terms */
export function addTerms(term: TermRef, count: number): Term {
  let { season, year } = term;
  for (let i = 0; i < count; i++) {
    if (season === "FALL") {
      season = "SPRING";
      year += 1;
    } else {
      season = "FALL";
    }
  }
  return makeTerm(season, year);
}

/** Parses "SPRING-2027" (any case); returns null when the text isn't a valid term */
export function parseTerm(text: string): Term | null {
  const match = /^(FALL|SPRING|SUMMER)-(\d{4})$/.exec(text.trim().toUpperCase());
  return match ? makeTerm(match[1] as TermSeason, Number(match[2])) : null;
}
