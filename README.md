# Sync - Team-12 Software-Engineering-Project

One place, one student, one destination.

Sync is a web/mobile app that helps college students plan their courses, track degree progress, understand prerequisites, and blend their degree with extracurricular activities and post-graduation plans.

**Team 12:** Raif Njie · Shalom Obed · Prosper Olusegun-Joseph · Maulin Patel

## Repo structure

```
sync/
├── frontend/     React + TypeScript + Tailwind (Vite) — the web app
├── backend/      Node + Express + TypeScript REST API — Prisma ORM over PostgreSQL
└── docs/         Design notes: database, recommendations
```

The frontend and backend are independent apps that only talk to each other over HTTP (`frontend/src/lib/api.ts` calls the backend's `/api/*` routes). Neither folder imports code from the other.

## Documents

- **SRS:** `docs/Sync_SRS_v1.0.docx` — requirements, use cases, architecture
- **Wireframes:** [design canvas](https://claude.ai/artifact/CsQX55c8yxGt2eZqZgTJig)
- **Testing scenarios:** [doc](https://claude.ai/artifact/RZi172rJwYho1jM57W8S29)
- **Database design:** [`docs/database.md`](docs/database.md) — tables, relationships, and design decisions
- **Recommendations:** [`docs/recommendations.md`](docs/recommendations.md) — how courses and post-grad options are ranked, and the API

## Getting started

You need **Node.js 22+** and **PostgreSQL 15+** running locally.

<details>
<summary>Don't have PostgreSQL yet?</summary>

- **macOS (Homebrew):** `brew install postgresql@15 && brew services start postgresql@15`, then add `/opt/homebrew/opt/postgresql@15/bin` to your `PATH` so `createdb` and `psql` work.
- **Windows:** install from [postgresql.org/download](https://www.postgresql.org/download/windows/). Remember the password you set for the `postgres` user, and use the "SQL Shell (psql)" or pgAdmin to create databases.
- **Any OS with Docker:** `docker run --name sync-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15`
</details>

### 1. Create the databases (once)

```bash
createdb sync_dev     # the app's data
createdb sync_test    # used only by the tests; it's emptied on every test run
```

(On Windows or Docker, run `CREATE DATABASE sync_dev;` and `CREATE DATABASE sync_test;` in psql instead.)

### 2. Backend

```bash
cd backend
cp .env.example .env     # then edit DATABASE_URL and TEST_DATABASE_URL (see below)
npm install              # also generates the Prisma client
npx prisma migrate dev   # creates the tables in sync_dev
npm run db:seed          # loads the course catalog and demo accounts
npm run dev              # http://localhost:5001
```

In `backend/.env`, point both URLs at your Postgres. Replace `USER` and `PASSWORD` with your Postgres login. With a default Homebrew install, use your Mac username and no password: `postgresql://yourname@localhost:5432/sync_dev`.

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/sync_dev?schema=public"
TEST_DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/sync_test?schema=public"
```

The backend runs on port **5001**, not 5000, because macOS uses port 5000 for AirPlay Receiver.

### 3. Frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env     # VITE_API_URL=http://localhost:5001
npm install
npm run dev              # http://localhost:5173
```

### 4. Log in

Open http://localhost:5173 and log in with a demo account. They all use the password **`password123`**:

| Email | Role | What you'll see |
|---|---|---|
| `mike.smith@gsu.edu` | Student | A senior with a full course history, a plan, and recommendations |
| `advisor@gsu.edu` | Advisor | Can view students' data but not change it |
| `admin@gsu.edu` | Admin | Can import catalog data |

Or click **Create an account** to start as a new student with an empty record.

### Everyday commands

| Where | Command | What it does |
|---|---|---|
| backend | `npm run dev` | Start the API (restarts on save) |
| backend | `npm test` | Run backend tests against `sync_test` |
| backend | `npm run db:seed` | Reset the demo accounts and reload the catalog (your own accounts are kept) |
| backend | `npm run db:reset` | Wipe `sync_dev` completely, re-create the tables, and seed |
| backend | `npm run db:studio` | Browse the database in your browser |
| frontend | `npm run dev` | Start the web app |
| frontend | `npm test` | Run frontend tests |

### After pulling changes

If someone changed `backend/prisma/schema.prisma`:

```bash
cd backend
npm install              # regenerates the Prisma client
npx prisma migrate dev   # applies new migrations to your database
```

To change the database yourself, edit `schema.prisma`, then run `npx prisma migrate dev --name what-you-changed` and commit the new folder in `prisma/migrations/`.

### Troubleshooting

| Problem | Fix |
|---|---|
| Page says "Can't reach the Sync server" | The backend isn't running, or `VITE_API_URL` in `frontend/.env` doesn't match `PORT` in `backend/.env`. Restart the frontend after editing `.env` |
| Sent back to the log in page | Your session expired or the database was reset. Log in again |
| `Can't reach database server` or `P1001` | Postgres isn't running, or `DATABASE_URL` is wrong |
| `database "sync_dev" does not exist` | Run step 1 |
| `Cannot find module '../generated/prisma/client'` | Run `npx prisma generate` in `backend/` |
| Tests fail with `TEST_DATABASE_URL is not set` | Add it to `backend/.env` and create `sync_test` |

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

- **Working end to end:** accounts (register, log in, log out), dashboard, Recommendations, and Timeline, all reading and saving each student's data in PostgreSQL.
- **Backend only so far:** entering completed courses (`/api/records`), target graduation term and credit limit (`/api/progress/:id/settings`), moving planned courses, and saved-opportunity tracking.
- **Coming soon:** the Progress, Map, and Plan pages. See each page or route file for its `TODO`.
