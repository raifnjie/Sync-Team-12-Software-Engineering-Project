# Sync - Team-12 Software-Engineering-Project

One place, one student, one destination.

Sync is a web/mobile app that helps college students plan their courses, track degree progress, understand prerequisites, and blend their degree with extracurricular activities and post-graduation plans.

**Team 12:** Raif Njie · Shalom Obed · Prosper Olusegun-Joseph · Maulin Patel

## Repo structure

```
sync/
├── frontend/     React + TypeScript + Tailwind (Vite) — the web app
├── backend/      Node + Express + TypeScript REST API — Prisma ORM over PostgreSQL
└── docs/         SRS, wireframes link, testing scenarios
```

The frontend and backend are independent apps that only talk to each other over HTTP (`frontend/src/lib/api.ts` calls the backend's `/api/*` routes). Neither folder imports code from the other.

## Documents

- **SRS:** `docs/Sync_SRS_v1.0.docx` — requirements, use cases, architecture
- **Wireframes:** [design canvas](https://claude.ai/artifact/CsQX55c8yxGt2eZqZgTJig)
- **Testing scenarios:** [doc](https://claude.ai/artifact/RZi172rJwYho1jM57W8S29)

## Getting started

**Backend**
```bash
cd backend
cp .env.example .env    # add your local Postgres connection string
npm install
npx prisma migrate dev  # creates the database schema
npm run dev              # http://localhost:4000
```

**Frontend**
```bash
cd frontend
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS, Vite |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT + bcrypt, role-based access control |

## Branching & contributing

- `main` is protected — no direct pushes. All work merges in through a pull request with at least one review.
- `develop` is the integration branch. Feature branches come off `develop`, not `main`.
- Branch naming: `feature/<short-description>` (e.g. `feature/dependency-map-api`), `fix/<short-description>`, `chore/<short-description>`.
- Keep commits small and scoped to one change; write messages as `type: what changed` (`feat:`, `fix:`, `chore:`, `docs:`).
- Open a PR into `develop` when a feature is ready; `develop` merges into `main` at the end of each sprint.
- CI (`.github/workflows/ci.yml`) runs on every push/PR and must pass before merging.

## Status

Sprint 1: repo structure, branching rules, and initial frontend/backend/docs scaffolding are in place. See each page/route file for its `TODO` — that's the starting point for Sprint 2.
