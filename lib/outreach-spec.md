# Outreach send mode

Spacebar-driven copy workflow for manual outreach.

## Steps per contact

1. Email address — copy to clipboard
2. Subject — template with `{first_name}`, `{name}`, `{company}` filled
3. Body — same variable substitution
4. On spacebar after body: mark sent in Supabase, advance to next contact

## After send

- `assignment` → `personal`
- `status` → `contacted`
- `last_contacted_date` → now
- `last_template_used` → current template name

## UX

- Spacebar disabled when focus is in input/textarea
- "✓ Copied" flash on each copy
- Progress: "N of M"
- Left sidebar: contact list with checkmarks for completed
