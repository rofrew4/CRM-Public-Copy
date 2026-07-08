# CRM Demo (Public Copy)

A sales CRM demo with contacts, lead pipeline, outreach templates, email inbox tracking, analytics, and to-dos. This repo is meant for **public demos only** — it should connect to its **own** Supabase project with **fictional sample data**, not your production CRM.

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
3. Paste and run the entire contents of [`supabase/demo_bootstrap.sql`](supabase/demo_bootstrap.sql).
4. In **Project Settings → API**, copy the project URL and `anon` public key.

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

`demo_bootstrap.sql` seeds fictional companies (Northwind Logistics, Brightpath Health, etc.), pipeline leads across stages, email inboxes, outreach templates, todos, and analytics-friendly history. All names, emails, and domains are made up for demo purposes.

## Schema migrations

Incremental migrations live in `supabase/migrations/` (used when evolving the production app). For a **fresh demo database**, running `demo_bootstrap.sql` alone is enough — it reflects the current schema in one script.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Demo Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Demo Supabase anon key |
| `OPENAI_API_KEY` | No | Server-only; lead note generation from transcript PDFs |
