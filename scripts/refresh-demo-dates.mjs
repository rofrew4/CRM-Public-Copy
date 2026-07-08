/**
 * Recompute demo follow-up / analytics dates relative to today.
 * Keeps the kanban mix (some urgent, some neutral, some snoozed) without a full re-seed.
 *
 * Usage: npm run seed:refresh-dates
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  DEMO_LEAD_TIMING,
  applyLeadTiming,
  buildDailyVolumeRows,
  buildMeetingBookedRows,
  tsFrom,
} from "./demo-timing.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const path = resolve(root, ".env.local");
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(url, key);
const base = new Date();

async function main() {
  console.log("Refreshing demo dates (relative to today)...");

  const leadIds = Object.keys(DEMO_LEAD_TIMING);
  const { data: leads, error: fetchErr } = await sb
    .from("leads")
    .select(
      "id, status, next_followup_at, last_followup_at, status_entered_at, awaiting_response_since, proposal_made, post_meeting_email_sent, noshow_count"
    )
    .in("id", leadIds);

  if (fetchErr) throw new Error(fetchErr.message);
  if (!leads?.length) {
    console.error("No demo leads found. Run npm run seed first.");
    process.exit(1);
  }

  let updated = 0;
  for (const row of leads) {
    const patch = applyLeadTiming(row, base);
    const { error } = await sb
      .from("leads")
      .update({
        status_entered_at: patch.status_entered_at,
        next_followup_at: patch.next_followup_at,
        last_followup_at: patch.last_followup_at ?? null,
        awaiting_response_since: patch.awaiting_response_since ?? null,
        proposal_made: patch.proposal_made,
        post_meeting_email_sent: patch.post_meeting_email_sent,
        noshow_count: patch.noshow_count ?? 0,
      })
      .eq("id", row.id);
    if (error) throw new Error(`${row.id}: ${error.message}`);
    updated++;
  }
  console.log(`  leads: ${updated} timing rows updated`);

  const meetingRows = buildMeetingBookedRows(base);
  for (const row of meetingRows) {
    const { error } = await sb
      .from("lead_meeting_booked_events")
      .upsert(row, { onConflict: "lead_id" });
    if (error) throw new Error(`meeting ${row.lead_id}: ${error.message}`);
  }
  console.log(`  meeting bookings: ${meetingRows.length} rows`);

  await sb
    .from("daily_sending_volume")
    .delete()
    .neq("log_date", "1970-01-01");
  const volume = buildDailyVolumeRows(base);
  const { error: volErr } = await sb.from("daily_sending_volume").insert(volume);
  if (volErr) throw new Error(`volume: ${volErr.message}`);
  console.log(`  sending volume: ${volume.length} days`);

  // Keep a few templates feeling recently used
  const templateOffsets = [2, 5, 8, 1, 30, 3, 12, 6];
  const templateIds = [
    "e1000001-0000-4000-8000-000000000001",
    "e1000001-0000-4000-8000-000000000002",
    "e1000001-0000-4000-8000-000000000003",
    "e1000001-0000-4000-8000-000000000004",
    "e1000001-0000-4000-8000-000000000005",
    "e1000001-0000-4000-8000-000000000006",
    "e1000001-0000-4000-8000-000000000009",
    "e1000001-0000-4000-8000-00000000000a",
  ];
  for (let i = 0; i < templateIds.length; i++) {
    await sb
      .from("templates")
      .update({ last_used_date: tsFrom(base, -templateOffsets[i]) })
      .eq("id", templateIds[i]);
  }
  console.log(`  templates: ${templateIds.length} last_used_date values`);

  console.log("\nDone — kanban highlights should look demo-ready again.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
