-- Remove quick-copy email snippets table (if you created it earlier)

DROP POLICY IF EXISTS "Allow all on outreach_snippets" ON outreach_snippets;
DROP TABLE IF EXISTS outreach_snippets;
