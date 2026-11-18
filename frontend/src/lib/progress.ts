import { catalog as sampleCatalog, type CatalogCourse, type RequirementCategory } from "./mockdata";

/* part / whole as a whole-number percent, kept between 0 and 100 */
export function toPercent(part: number, whole: number) {
  if (whole <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((part / whole) * 100)));
}

/* The still-needed courses of a category, as full course objects */
export function remainingCourses(category: RequirementCategory, catalog: CatalogCourse[] = sampleCatalog) {
  return category.remaining
    .map((code) => catalog.find((c) => c.code === code))
    .filter((c): c is CatalogCourse => c !== undefined);
}

/* Credits the student is taking right now toward a category */
export function inProgressCredits(category: RequirementCategory, catalog: CatalogCourse[] = sampleCatalog) {
  return remainingCourses(category, catalog)
    .filter((c) => c.status === "in-progress")
    .reduce((sum, c) => sum + c.credits, 0);
}
