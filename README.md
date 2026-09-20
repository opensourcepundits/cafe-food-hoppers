# Place

A minimalist directory of Mauritius cafes and restaurants for digital nomads, remote workers, and locals. Find work-friendly spots, check hours in Indian/Mauritius time, scan menus, and see live alerts and specials.

**Stack:** SvelteKit 5 · TypeScript · Tailwind CSS · PostgreSQL (JSONB) · Drizzle ORM · Vercel + Supabase

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
| `DATABASE_URL` | Yes | App connection string. Local Docker, or Supabase **transaction pooler** (port **6543**). |
| `DATABASE_URL_UNPOOLED` | Optional | Direct Supabase URL (`db.PROJECT.supabase.co:5432`) for one-off tools. |
| `SUPABASE_DATABASE_URL` | Alternative | Same as `DATABASE_URL` if you prefer the Supabase name. |
| `POSTGRES_URL` | Alternative | Also accepted (Vercel/Supabase integrations). |
| `PUBLIC_SUPABASE_URL` | Yes (client) | `https://PROJECT.supabase.co` |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes (client) | Supabase publishable (anon) key |

Copy [`.env.example`](.env.example). Never commit `.env`.

## Admin

Open `/admin/register` to create an account (email, phone, password). Sign in at `/admin/login` with **email or phone** plus password. From there you can add, edit, and delete places, including menus, hours, work setup, specials, and alerts.

Tables are created automatically on the first request. Anyone who registers can use the admin panel. The login page is not linked from the public nav until you are signed in.

## Database

`venues` is hybrid relational + JSONB: district, featured placement, and coordinates stay in columns; work setup, hours, announcements, specials, menu, and contact live in JSONB with GIN indexes.

Canonical SQL: [`src/lib/server/db/schema.sql`](src/lib/server/db/schema.sql)  
Drizzle schema: [`src/lib/server/db/schema.ts`](src/lib/server/db/schema.ts)

Schema is applied at runtime by [`src/lib/server/db/ensure-schema.ts`](src/lib/server/db/ensure-schema.ts) (`venues`, `users`, `sessions`). SQL files in `drizzle/` are optional history.

After changing `schema.ts` for local iteration:

```bash
npm run db:generate -- --name short_description
```

## Deploy to Vercel + Supabase

1. Create a [Supabase](https://supabase.com) project.
2. **Settings → Database → Connection string → URI**. Choose **Transaction** pooler (host `*.pooler.supabase.com`, port **6543**). Copy that URI.
3. In Vercel → **Settings → Environment Variables**, set for **Production and Preview**:
   - `DATABASE_URL` — the **transaction pooler** URI (`sslmode=require` is fine)
   - `PUBLIC_SUPABASE_URL` — `https://PROJECT.supabase.co`
   - `PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the publishable key from **Settings → API**
4. Redeploy. The first request creates tables. Then open `/admin/register` and create your account.
5. Optional: seed demo venues from this machine:

```powershell
$env:DATABASE_URL = "postgresql://postgres.PROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres"
npm run db:seed
```

To copy existing Neon rows into Supabase, dump and restore once:

```powershell
pg_dump --no-owner --no-acl $env:NEON_URL | psql $env:DATABASE_URL
```

Then point Vercel `DATABASE_URL` at Supabase and redeploy. You can disconnect the Neon store afterward.

## License

Private / unpublished unless you add one.
