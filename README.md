# CRM Demo (Public Copy)

A sales CRM demo with contacts, lead pipeline, **Cold Email** (campaigns / reply inbox / lists / accounts — fake data only), outreach templates, analytics, and to-dos. This repo is meant for **public demos only** — it should connect to its **own** Supabase project with **fictional sample data**, not your production CRM.

## Keep your original CRM safe

Your real CRM stays untouched if you follow these rules:

1. **Work only in this folder** (`crm copy`) — never change env vars or database settings on the original project.
2. **Create a new Supabase project** for the demo (e.g. name it `crm-demo`). Do not reuse production URL/keys.
3. **Do not copy `.env.local` from production** into this repo. Use `.env.example` and fill in the *demo* project credentials only.
4. **Deploy the demo as a new Vercel project** (or run locally). Do not link this folder to an existing Vercel project tied to production.
5. **Run `supabase/demo_bootstrap.sql` only on the demo database** — it creates tables and inserts fake data.

## Quick start (local)

### 1. Install dependencies

```bash
npm install
```

### 2. Create a demo Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Open **SQL Editor** → **New query**.
3. Run [`supabase/fresh_project_schema.sql`](supabase/fresh_project_schema.sql) (structure only).
4. Run [`supabase/seed_demo.sql`](supabase/seed_demo.sql) (fictional sample data), **or** from this folder run `npm run seed` (more reliable).
5. In **Project Settings → API**, copy the project URL and `anon` public key.

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-DEMO-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-demo-anon-key

# Optional — enables AI transcript summaries on the Leads page
OPENAI_API_KEY=
```

Restart the dev server after changing env vars.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Verify OpenAI (optional): [http://localhost:3000/api/leads/openai-status](http://localhost:3000/api/leads/openai-status) should return `configured: true` when the key is set.

## Deploy as a demo (Vercel)

1. Push this repo to GitHub (see below).
2. In [Vercel](https://vercel.com/new), import **CRM-Public-Copy** as a **new** project.
3. Add the same env vars from `.env.local` (demo Supabase URL/key; optional OpenAI key).
4. Deploy. Do not connect this to any existing production Vercel project.

## Git setup (this copy → public repo)

This folder is disconnected from the original private CRM repo. To publish:

```bash
cd "/Users/rowanfrew/Cursor projects/crm copy"
git remote -v                    # should show CRM-Public-Copy only
git push -u origin main          # first push to https://github.com/rofrew4/CRM-Public-Copy.git
```

## Sample data included

`seed_demo.sql` seeds a full fictional CRM dataset: 38 contacts, 18 pipeline leads (every stage + closed outcomes), 10 email inboxes, 10 outreach templates, 18 todos, 90 days of sending-volume history, 21 meeting-booked events for analytics charts, and outreach log history. All names, emails, and domains are made up. The script truncates seeded tables first so you can re-run it on a demo database.

**Kanban highlights** (overdue / due / snoozed / proposal-needed) are driven by real dates. They drift over time — before a demo, run `npm run seed:refresh-dates` to roll follow-up and analytics dates forward while keeping the same mix of card states. Full reset: `npm run seed`.

## SQL files

| File | Purpose |
|------|---------|
| `fresh_project_schema.sql` | Full schema for a **new empty** Supabase project |
| `seed_demo.sql` | Fictional demo rows (run after schema) |
| `demo_bootstrap.sql` | Schema + seed in one file (alternative) |
| `migrations/` | Incremental history from production — do not run on a fresh project |

**Do not** paste your old production migration SQL (ALTER/UPDATE backfills) onto a new project — use `fresh_project_schema.sql` instead.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Demo Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Demo Supabase anon key |
| `OPENAI_API_KEY` | No | Server-only; lead note generation from transcript PDFs |
