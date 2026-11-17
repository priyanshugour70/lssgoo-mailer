# Lssgoo Mailer — product audit & redesign notes

## Product
A multi-user tool for sending **individually addressed** email campaigns from the user's *own* SMTP mailbox.
Sign-in is Google OAuth only. Each user owns contacts, templates, SMTP senders and send history; contact lists
can be shared read-only between users via an access-request flow.

**Personas:** (1) solo sender who imports a list and mails it; (2) teammate who borrows another person's contacts
(People → request → approve).

**Core journey:** Setup (verify sender, write template) → Contacts (add/import) → Send (audience → message → review)
→ Overview (live progress) → History (per-recipient results).

## Architecture (unchanged)
Next.js 16 App Router, `cacheComponents`, React Compiler. Route handlers under `/api/v1/*` call `src/service/mailer/*`
(Drizzle + Postgres, schema `mailer`). Auth: signed session cookie (`jose`) + DB session row, enforced in `src/proxy.ts`
and `requireApiUser()`. Campaigns run in `after()` after the 202 response; progress is persisted on the `campaigns` row.

## Routes
`/` Overview · `/send` wizard · `/contacts` (mine / shared) · `/history` · `/setup` (senders / templates) ·
`/people` (directory / requests to you / your requests) · `/profile` · `/sign-in`.

## Problems found → what changed
| Area | Problem | Fix |
|---|---|---|
| Data integrity (P0) | Re-importing a bare email via bulk import **wiped** saved name/company/notes (upsert set them to null). | Upsert now only overwrites provided fields; edits go through a new `PATCH /contacts/:id`. |
| Privacy (P0) | `listSharedContacts` also matched `ownerId = viewer`, so a user's *own* contacts appeared in "Shared" (once per grant). | Query restricted to `viewerId = me`. |
| Security | Template placeholders were injected into HTML bodies unescaped. | HTML bodies escape substituted values. |
| Misleading metric | "Emails logged" counted sent + skipped + failed. | Overview shows sent / failed separately; links to filtered history. |
| History | Hard cap of 30 rows; status filter ran client-side on those 30. | Server-side pagination, status filter, search, per-status counts. |
| People | Requests could be duplicated; message hardcoded; failures ignored. | Duplicate/already-granted guarded server-side; optional message; errors surfaced. |
| CRUD gaps | No way to edit/delete contacts, templates, senders. | Added edit/delete (contacts also bulk). Templates/senders used by past campaigns return a clear 409 (FK `RESTRICT`). |
| Navigation | No desktop nav at all; "Back" always went home; tab/filter state lost on refresh. | Sidebar (desktop) + top bar/bottom dock/More sheet (mobile); tab, search, status, page live in the URL. |
| Feedback | Inline banners, silent failures, no confirmation for destructive/send actions. | Toasts, confirm dialogs (delete, send), field-level validation, duplicate-submit guards, unsent-work warning in Send. |
| Visual | Destructive colour was grey; gradients, floating logo, live clock, hard-coded brand colours. | Semantic token set (success/warning/destructive/info), no decoration. |
| Send wizard | Default select values weren't in state; locale-string campaign name; no preview. | Real state, editable name, template preview, draft persisted in `sessionStorage`. |

## Design system (`src/app/globals.css`)
Tokens: surface/background/foreground, primary (ink), accent, border/border-strong, muted-foreground (≥4.5:1),
success/warning/destructive/info (+ `-soft`), chart-1..3, radii 4–20px, type scale (11–24px), `shadow-xs/sm/popover`,
motion (`fade-up`, reduced-motion honoured globally), layout (`sidebar`, `topbar`, `dock`) and z-index names.
Controls are 44px tall below `md`, 36px above; inputs use 16px text on touch widths to prevent iOS zoom.

Shared components: `src/components/app/*` (PageHeader, UrlTabs, SearchInput, Pagination, StatusBadge, FormField,
EmptyState/ErrorState, providers: toast + confirm) and `src/components/ui/*` (Button with `loading`, Input, Textarea,
Select, Checkbox, Dialog = centered ≥sm / bottom sheet on mobile, Badge status variants).

## Known gaps / not done
- **Authenticated screens were not exercised in a browser.** The dev DB is a remote host and sign-in is Google-only;
  I did not seed a user or forge a session there. Verified: typecheck, lint, production build, sign-in page at
  desktop & 375px, redirect of every app route, 401 on API GETs.
- No automated test runner exists in the repo (no Playwright/Vitest); none was added.
- Campaigns whose server process dies mid-run stay `running` forever (no heartbeat/recovery) — needs a product decision.
- Dark mode removed: tokens existed but nothing ever applied the `.dark` class.
- Campaign detail page and campaign cancel/resume are not implemented (no backend support).

## Round 2 additions
- **Smart contact import** (`src/lib/contacts/parse.ts`, shared by preview and API): any mix of commas, spaces,
  semicolons, tabs, pipes and newlines; `Name <email>`, `"Last, First" <email>`, `email (Name)`; CSV with header row
  (comma/semicolon/tab); names guessed from dotted/underscored addresses (`john.doe@` → John Doe; team mailboxes such
  as `info@` stay blank); optional company-for-all. Existing contacts only have blank fields filled, never overwritten.
  Batched inserts (≤5000 per import). File upload (.csv/.tsv/.txt) and CSV export (formula-injection safe).
- **Templates:** edit, duplicate, live preview (HTML in a sandboxed iframe), "send test to me" via a verified sender.
- **Campaigns:** list + detail pages (live progress, per-recipient results, status filter, pagination), retry failed,
  resume stalled runs without duplicating sends, preflight validation (template / verified sender / recipients).
- **Sending engine:** one pooled SMTP connection per run, `maxDuration = 300`, crashes mark a campaign `failed`.
- **Needs a schema migration (not done):** tags/groups, unsubscribe + suppression list, scheduled sends, per-user
  daily send limits, open/click tracking.
