# Place

A Mauritius cafe and restaurant directory for people looking for somewhere to sit, eat, and work. Hours follow **Indian/Mauritius time (UTC+4)**. Featured listings are paid placements. The site is an independent index and is not affiliated with the venues it lists.

**Live:** [place.dot42.dev](https://place.dot42.dev)

**Stack:** SvelteKit 5 · TypeScript · Tailwind CSS · PostgreSQL (JSONB) · Drizzle ORM · Vercel + Supabase

---

## Features

### Directory (`/`)

The home page is a searchable list of places.

- **Search** matches venue name, district, menu category, dish name or description, and special title or body.
- **District** filter: Grand Baie, Ebène, Tamarin, Port Louis, Moka, or all.
- **Work friendly** — WiFi, laptop seating, and outlets are all set. This is the “can I work here for a few hours?” flag.
- **Not work friendly** — the opposite: missing WiFi, laptop seating, or outlets.
- **WiFi** / **Outlets** — filter on those flags alone.
- **Open now** — currently within today’s hours (including overnight close times).
- **Open till late** — at least one day closes at 21:00 or later, or overnight.
- **Ongoing specials** / **Upcoming specials** — places with a live deal or a dated upcoming one.
- Results sort **featured first**, then by featured priority, then name.
- Each card shows open/closed, today’s hours, work chips, and the first live or upcoming special.

Empty filter results show a clear empty state instead of a blank grid.

### Venue page (`/venues/[slug]`)

A full page for one place:

- Name, district, **open/closed** badge, today’s hours, and **open till late** when it applies.
- **Alerts** in date range (notice, event, closure, alert) — for example a temporary closure.
- **Specials** split into on now vs upcoming, with Mauritius dates.
- **Menu** by category: name, description, tags, price in MUR (`Rs`).
- **Work setup**: WiFi quality, outlets, noise, free-text notes, and whether it qualifies as work friendly.
- **Weekly hours**, including split sittings (see Opening hours).
- **Contact**: phone, Instagram, website, email, Google Maps link.
- **Map pin** embed when coordinates are known.

### Specials feed (`/specials`)

A site-wide list of **on now** and **upcoming** promotions from every venue. Ended specials are hidden. Times are Indian/Mauritius.

### Opening hours

Hours are stored per weekday in Mauritius time.

- Each day can be **closed**, or have one or more **open–close sittings**.
- Split days are supported, e.g. 09:00–14:00 then 18:00–21:00.
- Overnight spans (close earlier than open, e.g. 22:00–02:00) count as still open after midnight.
- **Open now** and card labels use the current Mauritius clock, not the visitor’s timezone.
- **Open till late** is true if any sitting closes at 21:00 or later, or runs overnight.

### Location and maps

Admins do not enter latitude and longitude. They paste a **Google Maps place or pin link**. The app:

- Stores the URL on the venue.
- Parses coordinates from common Maps URL shapes (`@lat,lng`, `!3d/!4d`, `query=` / `q=`).
- Shows a pin preview in admin and an embed on the public venue page.
- Short links (`maps.app.goo.gl`) still save as the Maps URL; the pin preview needs a full place URL if coords cannot be parsed.

### Work setup

Each venue can record:

| Field | Meaning |
| --- | --- |
| WiFi | Present or not, plus quality: fast / ok / slow |
| Outlets | Present or not, plus plenty / some / none |
| Laptop friendly | Seating suitable for a laptop |
| Noise | quiet / moderate / loud |
| Notes | Extra context (crowds, terrace, etc.) |

**Work friendly** = WiFi **and** laptop friendly **and** outlets.

### Featured placement

A venue can be marked featured with a numeric **priority**. Featured cards get a label and sort above the rest. This is intended as a paid placement.

### Admin (`/admin`)

The public nav shows **Admin** only after sign-in. The login page is not advertised on the public site.

**Accounts**

- Register at `/admin/register` with email, phone, and password.
- Sign in at `/admin/login` with **email or phone** plus password.
- Passwords are stored as scrypt hashes. Sessions last 7 days in an HTTP-only cookie.
- Anyone who registers can manage places (there is no separate admin role).

**Place list**

- Search by name or district.
- Counts for menu items and specials.
- Create, edit, sign out.

**Venue form**

- Name, URL slug (auto from name, editable), district, featured + priority.
- Google Maps pin (see above).
- Work setup fields.
- Hours: closed checkbox, time ranges, **Add hours** for a second sitting, copy Monday to all days.
- Contact: phone, Instagram handle, website, email.
- Menu: categories, items, MUR prices, comma-separated tags.
- Specials and alerts: title, body, start and optional end (Mauritius local datetime).

Saving writes one JSON payload; the server validates times, maps pin, and unique slugs.

---

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

Local Postgres is on **port 5433** so it does not collide with 5432.

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

Vercel may also inject `CAFE_DB_*` Postgres URLs; the app reads those as fallbacks.

## Database

`venues` is hybrid relational + JSONB: district, featured placement, and coordinates stay in columns; work setup, hours, announcements, specials, menu, and contact live in JSONB with GIN indexes.

`users` and `sessions` store admin accounts.

Canonical SQL: [`src/lib/server/db/schema.sql`](src/lib/server/db/schema.sql)  
Drizzle schema: [`src/lib/server/db/schema.ts`](src/lib/server/db/schema.ts)

Schema is applied at runtime by [`src/lib/server/db/ensure-schema.ts`](src/lib/server/db/ensure-schema.ts) (`venues`, `users`, `sessions`). SQL files in `drizzle/` are optional history.

After changing `schema.ts` for local iteration:

```bash
npm run db:generate -- --name short_description
```

## Deploy to Vercel + Supabase

1. Create a [Supabase](https://supabase.com) project.
2. **Settings → Database → Connection string → URI**. Choose **Transaction** pooler (host `*.pooler.supabase.com`, port **6543**). Username must be `postgres.PROJECT_REF`. URL-encode special characters in the password. Prefer `sslmode=require`.
3. In Vercel → **Settings → Environment Variables**, set for **Production and Preview**:
   - `DATABASE_URL` — the **transaction pooler** URI
   - `PUBLIC_SUPABASE_URL` — `https://PROJECT.supabase.co`
   - `PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the publishable key from **Settings → API** (this key is meant to be public)
4. Redeploy. The first request creates tables. Then open `/admin/register` and create your account.
5. Optional: seed demo venues from this machine:

```powershell
$env:DATABASE_URL = "postgresql://postgres.PROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres"
npm run db:seed
```

Do not use the `db.PROJECT.supabase.co` host on Vercel (IPv6-only). Use the pooler.

## License

Private / unpublished unless you add one.
