# Recommendations

The Recommendations page (`/recs`) suggests three kinds of things, each with plain-language reasons:

| Tab | What it shows | Requirement |
|---|---|---|
| Courses | Eligible courses for next term, ranked, fitted to the student's credit limit, plus locked courses and what they need | FR-7.1, FR-7.3, FR-5.2 |
| After graduation | Graduate programs and full-time jobs | FR-10.4 |
| Experiences | Research, internships, teaching, certifications, clubs | FR-10.4 |

The student's **goal** (graduate school, job in industry, undecided) and **interests** re-rank everything (FR-7.2). Any item can be dismissed and restored. Courses can be added to the plan, and post-grad options can be saved.

## Where the code lives

| File | Role |
|---|---|
| `backend/src/services/recommendation.service.ts` | Scoring and ranking (pure functions, unit tested) |
| `backend/src/services/prerequisite.service.ts` | Prerequisite checks (AND/OR groups, corequisites), unlock counts, longest chain, cycle detection |
| `backend/src/services/progress.service.ts` | Which requirement categories are still open |
| `backend/src/routes/recommendations.routes.ts` | REST API |
| `backend/src/repositories/*.ts` | Load the catalog and each student's data from PostgreSQL (see `docs/database.md`) |
| `backend/src/data/*.ts` | Domain types and the **sample** data loaded by `npm run db:seed` |
| `frontend/src/pages/recommendationspage.tsx` | The page |
| `frontend/src/lib/api.ts`, `frontend/src/lib/recommendations.ts`, `frontend/src/lib/usePlan.ts` | API helper, typed client, and shared plan state |

## How courses are ranked

1. **Filter.** Keep courses that count toward an open requirement, are not taken, in progress, or dismissed, have their prerequisites met (in-progress courses count as passed when planning next term), and are offered next term. Courses that are needed but locked go to "Coming up later" with what they're missing.
2. **Score** (weights in `COURSE_WEIGHTS`):

| Factor | Points | Reason shown |
|---|---|---|
| Required course | 40 | "Required for Upper-Division Core" |
| Elective in an open group | 10 + 15 × share of elective credits still needed | "Counts toward CS Electives (6 credits left)" |
| Unlocks remaining courses | 6 each, up to 4 | "Unlocks 2 courses you still need: ..." |
| Starts a prerequisite chain | 7 per step, up to 3 | "Starts a 3-course prerequisite chain..." |
| Matches interests | 10 each, up to 2 | "Matches your interest in data" |
| Leads to an interest-matching course | 5 | "Leads to CSC 4850 Machine Learning..." |
| Supports the goal | 5 | "Supports your goal: graduate school" |
| Only offered this season | 5 | "Only offered in Spring..." |

3. **Fit.** Take courses in rank order until the credit limit (default 15) is reached. The rest are shown but flagged as over the limit.

## How post-grad options and experiences are ranked

Goal match (40, or 15 for everyone when undecided) + interest matches (12 each, up to 2) + readiness (25 × share of related courses taken) + deadline within 60 days (10). Options whose deadline has passed, and matches scoring under 20, are left out. Each one names a related course the student hasn't taken yet ("Taking CSC 4850 would strengthen your application").

## API

All routes need `Authorization: Bearer <token>`. `:studentId` can be `me`. Students can only reach their own data. Advisors and admins can read a student's recommendations but can't change them.

| Method & path | Body | Returns |
|---|---|---|
| `GET /api/recommendations/:studentId?term=SPRING-2027` | | Full recommendations (term defaults to the next fall/spring) |
| `PATCH /api/recommendations/:studentId/preferences` | `{ goal?, interests? }` | Re-ranked recommendations |
| `POST /api/recommendations/:studentId/dismissals` | `{ kind: "course" \| "opportunity", id }` | Re-ranked recommendations (201) |
| `DELETE /api/recommendations/:studentId/dismissals/:kind/:id` | | Re-ranked recommendations |

Errors: 400 bad input, 401 no token, 403 someone else's data or an invalid token.

## Known limitations

- The catalog and opportunities are sample data (`npm run db:seed`) until real GSU catalog data is imported.
- Personal schedule and extracurricular time conflicts (FR-7.2, FR-9) aren't considered yet.
- A course is counted toward the first requirement category that lists it.
