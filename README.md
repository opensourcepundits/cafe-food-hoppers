# Place

A minimalist directory of Mauritius cafes and restaurants for digital nomads, remote workers, and locals. Find work-friendly spots, check hours in Indian/Mauritius time, scan menus, and see live alerts and specials.

**Stack:** SvelteKit 5 · TypeScript · Tailwind CSS · PostgreSQL (JSONB) · Drizzle ORM · Vercel + Neon

## Local development

Requires Node 20+ and Docker.

```bash
cp .env.example .env
npm install
npm run db:start
npm run db:setup
npm run dev
```

The app is at [http://localhost:5173](http://localhost:5173).

Local Postgres is published on **port 5433** so it does not collide with an existing server on 5432.

| Script | What it does |
| --- | --- |
| `npm run db:start` | Start Docker Postgres |
| `npm run db:push` | Push the Drizzle schema (local iteration) |
| `npm run db:migrate` | Apply SQL migrations in `drizzle/` |
| `npm run db:seed` | Replace venue rows with demo Mauritius data |
| `npm run db:setup` | Start DB, push schema, seed |
| `npm run db:studio` | Open Drizzle Studio |

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | App connection string. Local Docker, or Neon **pooled** (`-pooler`) on Vercel. |
| `DATABASE_URL_UNPOOLED` | Neon only | Direct Neon URL for `drizzle-kit migrate`. Pooled URLs can fail migrations. |
| `CAFE_DB_DATABASE_URL` | Alternative | Same as `DATABASE_URL` when Vercel’s Neon integration prefixes the store name. |
| `CAFE_DB_DATABASE_URL_UNPOOLED` | Alternative | Same as `DATABASE_URL_UNPOOLED` from that integration. |
| `ADMIN_PASSWORD` | Admin panel | Password for `/admin` (create/edit/delete places). Set on Vercel too. |

Copy [`.env.example`](.env.example). Never commit `.env`.

## Admin

Open `/admin` and sign in with `ADMIN_PASSWORD`. From there you can add, edit, and delete places, including menus, hours, work setup, specials, and alerts.

Set the same `ADMIN_PASSWORD` on Vercel (Production and Preview). The login page is not linked from the public nav.

## Database

`venues` is hybrid relational + JSONB: district, featured placement, and coordinates stay in columns; work setup, hours, announcements, specials, menu, and contact live in JSONB with GIN indexes.

Canonical SQL: [`src/lib/server/db/schema.sql`](src/lib/server/db/schema.sql)  
Drizzle schema: [`src/lib/server/db/schema.ts`](src/lib/server/db/schema.ts)

Migrations (run these on Neon):

1. [`drizzle/0000_venues.sql`](drizzle/0000_venues.sql) — table, indexes, JSONB columns including `specials`
2. [`drizzle/0001_updated_at.sql`](drizzle/0001_updated_at.sql) — `updated_at` trigger

After changing `schema.ts`:

```bash
npm run db:generate -- --name short_description
```

Commit the new files under `drizzle/`.

## Deploy to Vercel + Neon

1. Create a Git repo and push this project.
2. Create a [Neon](https://neon.tech) project (or **Vercel → Storage → Neon** and connect it). Postgres 16 is fine.
3. Import the repo in Vercel. Framework: SvelteKit. Node 20+.
4. Set environment variables on the Vercel project for **Production, Preview, and Development**, and leave them available at **Build** and **Runtime**:
   - `DATABASE_URL` — Neon **pooled** string (`ep-…-pooler.…`, `sslmode=require`)
   - `DATABASE_URL_UNPOOLED` — Neon **direct** string (no `-pooler`)

   Connecting Neon via **Vercel → Storage** is enough: those values arrive as `CAFE_DB_DATABASE_URL` and `CAFE_DB_DATABASE_URL_UNPOOLED`. The app reads both naming styles.

   After saving variables, **redeploy**. A missing `DATABASE_URL` used to fail `npm run build` during SvelteKit’s server analysis; the app still needs a database URL at runtime.
5. Apply migrations and seed **once** against Neon from your machine:

```bash
# Direct URL — required for migrate
set DATABASE_URL_UNPOOLED=postgresql://USER:PASSWORD@ep-xxx.REGION.aws.neon.tech/neondb?sslmode=require
npm run db:migrate

# Pooled or direct both work for seed
set DATABASE_URL=postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
npm run db:seed
```

On PowerShell use `$env:DATABASE_URL_UNPOOLED = "..."`.

6. Deploy. Later schema changes: commit a new file from `npm run db:generate`, then run `npm run db:migrate` against Neon (or set the Vercel build command to `npx drizzle-kit migrate && vite build` so production applies migrations on each deploy).

The app uses Neon’s HTTP driver when `DATABASE_URL` points at `neon.tech`, and postgres.js against local Docker.

## License

Private / unpublished unless you add one.
