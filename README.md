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

Copy [`.env.example`](.env.example). Never commit `.env`.

## Admin

Open `/admin/register` to create an account (email, phone, password). Sign in at `/admin/login` with **email or phone** plus password. From there you can add, edit, and delete places, including menus, hours, work setup, specials, and alerts.

The `users` and `sessions` tables are created automatically on the first request (no `npm run db:migrate` needed). Anyone who registers can use the admin panel. The login page is not linked from the public nav until you are signed in.

## Database

`venues` is hybrid relational + JSONB: district, featured placement, and coordinates stay in columns; work setup, hours, announcements, specials, menu, and contact live in JSONB with GIN indexes.

Canonical SQL: [`src/lib/server/db/schema.sql`](src/lib/server/db/schema.sql)  
Drizzle schema: [`src/lib/server/db/schema.ts`](src/lib/server/db/schema.ts)

Migrations (run these on Neon):

1. [`drizzle/0000_venues.sql`](drizzle/0000_venues.sql) — table, indexes, JSONB columns including `specials`
2. [`drizzle/0001_updated_at.sql`](drizzle/0001_updated_at.sql) — `updated_at` trigger
3. [`drizzle/0002_users.sql`](drizzle/0002_users.sql) — admin `users` and `sessions` (also applied at runtime by [`src/lib/server/db/ensure-schema.ts`](src/lib/server/db/ensure-schema.ts))

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

   After saving variables, **redeploy**. The app creates `users` and `sessions` on the first request. Seed demo venues once if the directory is empty:

```bash
set DATABASE_URL=postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
npm run db:seed
```

On PowerShell use `$env:DATABASE_URL = "..."`.

The app uses postgres.js for Neon and local Docker.

## License

Private / unpublished unless you add one.
