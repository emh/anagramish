# Production deployment

GitHub Pages serves `https://anagramish.com`. The game API is `https://anagramish-api.emh.workers.dev`; analytics is `https://anagramish-analytics.emh.workers.dev`. Custom domains are optional. Neither Worker serves the game frontend.

The browser stores a signed anonymous player token on `anagramish.com` and sends it in the Authorization header. This avoids third-party cookie restrictions. Tokens expire after one year and renew on game load. Clearing site storage creates a new anonymous player; saved games remain separate from the token. No user account or third-party runtime dependency is introduced.

## One-time account setup

1. In [repository Pages settings](https://github.com/emh/anagramish/settings/pages), set **Build and deployment → Source → GitHub Actions**. Keep the custom domain `anagramish.com` and HTTPS enabled. Do this before merging: deploying the repository root would expose Worker word-data files and would not configure the API URL.
2. Create a Cloudflare API token scoped to the account containing `emh.workers.dev`, with **Account / Workers Scripts / Edit** and **Account / D1 / Edit**. The workflow uses the account Workers subdomain API to check that it is targeting `emh`. No DNS permissions are needed. This token is for deployments, never for browsers.
3. In [repository Actions secrets and variables](https://github.com/emh/anagramish/settings/secrets/actions), add:

   | Type | Name | Value |
   | --- | --- | --- |
   | Secret | `CLOUDFLARE_API_TOKEN` | Scoped token from step 2 |
   | Secret | `PLAYER_SIGNING_KEY` | Random secret, at least 32 characters |
   | Secret | `ANALYTICS_INGEST_TOKEN` | A different random secret, at least 32 characters |
   | Variable | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
   | Variable | `ANALYTICS_ADMIN_EMAIL` | Your dashboard login email |

   Generate each random secret locally with `openssl rand -hex 32`. Save each directly as a GitHub secret. Keep the signing key stable: replacing it resets anonymous identities and prevents reopening existing server sessions under their old identity.

4. Merge the feature branch to `main`. The workflow creates or reuses separate D1 databases named `anagramish-game-production` and `anagramish-analytics-production`, applies pending migrations, deploys analytics, then the game API, checks the API and dashboard protection, and publishes the frontend allowlist to Pages. If a Worker or smoke check fails, the Pages job does not run. First-time analytics remains locked until Access is configured below.

## Owner login with Cloudflare Access

After the first Worker deployment:

1. Set up Cloudflare Zero Trust and choose an Access team name.
2. Open **Workers & Pages → anagramish-analytics → Access**, enable Access for **All traffic**, and select the Cloudflare account policy. Configure the corresponding Access application to cover the entire hostname, with an **Allow** policy for your exact email. One-time PIN login is sufficient. Remove any broad Allow policies; do not add a public Bypass policy.
3. From that Access application, copy the **Application Audience (AUD) Tag**. Add repository variables `CF_ACCESS_AUD` with that tag and `CF_ACCESS_ISSUER` with `https://YOUR-TEAM.cloudflareaccess.com` (no trailing slash). Keep `ANALYTICS_ADMIN_EMAIL` set to the same allowed email.
4. Run **Actions → Deploy production → Run workflow** on `main`. Open the analytics URL and sign in. Reports default to Production.

For Worker-level Access, the Worker checks the trusted `ctx.access` application audience and the owner email returned by `ctx.access.getIdentity()`. For hostname-based Access, it independently verifies the assertion JWT signature, issuer, audience, expiry, and owner email. Bare email headers are not trusted in production. Missing Access settings fail closed. The game sends analytics through a private Cloudflare service binding with a separate ingestion secret, so it does not need an Access bypass or a browser analytics credential.

Preview deployments use the distinct `AUTH_MODE=sites` setting and retain their private hosting layer. Never enable Sites authentication mode on a public Cloudflare Worker.

## Subsequent deployments and recovery

Push to `main` to deploy both Workers and Pages in sequence. The workflow pins Wrangler through both package lockfiles. D1 migrations are additive, tracked by Wrangler, and never rewritten after application. Each Worker has its own production database; preview data is not copied.

Deployments across two Workers and Pages are not an atomic transaction. Keep API changes compatible with the currently deployed frontend. If Pages deployment fails after Workers succeed, fix the issue and rerun the workflow. To roll back code, revert the offending commit and deploy; do not delete databases or blindly reverse migrations. GitHub stores the frontend artifact for the release.

The API uses a Cloudflare rate-limit binding (120 requests per minute per IP per location). Raw IP addresses are only used as transient limiter keys, not stored in D1. This is a basic abuse limit, not bot prevention or a billing cap. Failed analytics deliveries remain in D1 and retry on gameplay and every five minutes. Detailed gameplay and event rows currently have no automated deletion policy; revisit retention as volume grows.

## Launch verification

- Wait for both production workflow jobs to succeed. Its smoke test checks cross-origin preflight, anonymous session issuance, puzzle delivery, word-list exclusion, and unauthenticated dashboard denial without recording fake gameplay.
- Play a real game at `anagramish.com`, reload mid-game, and confirm the saved game resumes. Check a browser with third-party cookies blocked.
- Sign into analytics, select Production, and confirm the real visit/play/completion arrives. Direct unauthenticated report requests must remain denied.
- Submit `https://anagramish.com/sitemap.xml` in the Search Console property the owner has already added. Use approximately zero organic search traffic as an owner-supplied starting assumption, not a measured historical export.

## Current access limitations

The coding environment has no Cloudflare account credentials. Its GitHub connection supports source pushes, but direct GitHub API calls for Pages settings and Actions secrets/variables are unavailable. Account setup must be completed in those dashboards before the branch is pushed to `main`. No production deployment is implied by a feature-branch push.

## Analytics daily summary cache

The analytics Worker no longer runs report queries over raw `events`. Migration
`0001_daily_summaries.sql` adds a cursor index, private summary/checkpoint tables,
a small report cache, and an insert trigger that records newly received events.
Existing production deployment applies the migration before deploying the Worker.
The migration does not delete or change historical events.

- Every five minutes the analytics Cron Trigger summarizes new events, in batches
  of at most 2,000. Opening the owner dashboard also advances backfill. The first
  load shows a preparation message and retries until the initial history is ready.
- Daily aggregates are packed into parts of at most 500 raw rowids, keeping each D1
  value bounded. Finalized parts never need rebuilding. Only the unfinished part
  (at most 499 old events) is reread when new events arrive. An environment/rowid
  index makes this a range seek, not a scan of the whole history.
- Daily summaries retain compact browser, session, attribution and timestamp facts
  for exact period uniqueness, cross-day completions, acquisition and tutorial
  cohorts. Those facts remain private and are never returned to the browser.
  Reports use all historical summaries for first-ever cohorts; daily uniques are
  not summed into period uniques. Raw events remain the recovery source.
- The 7/28/90-day report responses are cached separately per environment and cursor.
  A warm dashboard request reads a checkpoint and one response row, plus the
  checkpoint lease check. It reads no raw events. This is D1-backed; restarting
  the Worker or using another Cloudflare location does not discard the cache.
- Report snapshots expire within five minutes and at UTC midnight. Cohort age is
  recalculated even without new activity. The dashboard and JSON export include
  the summary update time. Refresh does not bypass the cache.
- Duplicate event retries do not advance the cursor. Late events are appended and
  update the correct historical day, first source and session outcomes. A lease
  prevents concurrent rebuilds; summaries and the cursor publish in one D1 batch.
- The insert trigger adds one small checkpoint write per accepted event, and the
  extra event index adds index writes. This deliberately trades modest writes and
  storage for sharply fewer report reads. The cache does not change game API reads.

Validation: SQLite differential tests compare every report section with the former
SQL queries, plus bounded backfill, late delivery, duplicate retries, UTC rollover,
refresh throttling and recovery after failure. A Miniflare/D1 test checks that a
warm report reads at most four rows in its cache-read batch after 1,200 events.
Measure the real production reduction in Cloudflare's D1 `rows_read` metrics after
deployment; a percentage from a synthetic fixture is not a production measurement.

Operational limits: raw events are append-only. Do not delete/update raw events or
run VACUUM (which may renumber implicit rowids) while retaining these checkpoints.
For an intentional correction or future retention policy, stop summary refreshes,
clear `analytics_daily_summaries` and `analytics_report_cache`, then reset each
`analytics_summary_state` cursor/refreshed_at/next_refresh/lease_until to 0,
lease_token to NULL, and latest_rowid to the current MAX(events.rowid) for that
environment. Re-enable refreshes to rebuild. Any future change to summary format
must likewise explicitly invalidate/version the derived tables.

The cache removes D1 scans, but cold report aggregation still grows with retained
summary history in Worker memory. If traffic grows substantially beyond the
current scale, compact long-term player/cohort facts before pruning raw history.

## Period averages and chart coverage

Reports include `coverage`: the first recorded activity day for the selected
environment, the covered start/end dates, completed-day count, sum of daily
unique players (`player_days`), and `average_daily_players`. The average starts
at the later of the requested period start and first recorded activity date,
and ends yesterday UTC. Days with no activity inside that interval count as
zero; dates before tracking and today's unfinished day do not enter the average.
No completed covered days produces `null` (shown as a dash), not a zero average.
The first recorded activity date is a proxy for tracking availability, not proof
of all-day instrumentation or uninterrupted collection; its initial day may be
partial. No known collection-outage calendar is available.

The chart uses the report's dates rather than the viewer's clock, omits dates
before coverage, and marks today's partial bar. Hover, focus/arrow keys or tap
shows exact daily counts, including tracked zero-activity dates. Period totals
and the chart still include daily and practice games, as labeled; the Today/
Yesterday breakdown keeps them separate. Neither change adds raw D1 reads.

Calculation audit: D1/D7 retention uses unique first-play cohorts only after the
entire return day ends; acquisition finish rates wait until the first UTC day
ends; tutorial funnel and A/B outcomes wait a full 24 hours from the first attempt.
These use eligible browsers/attempts, not calendar-day divisors. Game duration,
mistake and word-count averages use completed games with recorded values, even
if those games finish on the current day. Source/location percentages use the
selected day's players. No other fixed-period denominator was found.

## Today overview

The dashboard also includes `today_overview` in each report and JSON download.
It also includes `yesterday_overview`, selectable above the cards. Both use UTC
dates and display their boundaries in the viewer's local timezone. This keeps
the previous day's breakdown accessible after UTC midnight without extra queries.
It derives current UTC-day visitors, players, first-ever/returning players,
starts, completions, distinct finishers, tutorial counts by variant and game-start diagnostics
from existing summary facts. Daily and practice games are separate; the headline
metrics, sources and geography use daily puzzles only. New/returning status is
calculated independently from each game type’s history. Each player's first game activity today determines
their one source/campaign and country/region bucket within each game type, so each breakdown sums to
the player total. These are player attribution counts, not visitor referrers;
no referring page paths or raw identifiers are returned. Tutorial completions
match the exact attempt’s start across all history to identify its variant.
Untagged attempts or completions with a missing start are shown separately. First-ever status uses
all cached history, even outside the selected period. No migration, summary
rebuild or additional raw-event query is required. Existing cached responses
gain the section within the normal five-minute expiry; UTC midnight invalidates
the prior day's response.

## Tutorial experiment

The game Worker enables `tutorial-short-v1` through `TUTORIAL_EXPERIMENT` in
`scripts/production-config.mjs`. Migration `0002_tutorial_experiment.sql` adds
nullable experiment and variant fields before analytics and API deployment.
Existing summaries remain valid; this additive metadata needs no raw-history
rebuild. Cached reports acquire the experiment section within their normal
five-minute expiry. The dashboard cohort spans the lifetime of the experiment,
independent of the selected report period.

See [the experiment plan](growth/tutorial-experiment-2026-11-02.md) for assignment,
eligibility, the planned review and limitations. To stop enrollment, set that
configuration value to an empty string and deploy; already assigned attempts can
still report outcomes. Direct Cloudflare variable changes are overwritten by the
next GitHub deployment.


## Player feedback

The persistent header button opens an optional feedback screen. Puzzle completion
also offers Too easy / Just right / Too hard and a comment link below the result
and sharing controls. Players explicitly press Send feedback; opening the form
or choosing a rating does not submit anything. The current board is preserved,
and the game clock pauses while the form is open. Comments are limited to 1,000
characters, no email is requested, and no feedback is added to gameplay metrics.

The signed game API validates session ownership and snapshots context at receipt:
mode (daily or practice), puzzle date, difficulty, server-recorded completion,
app build commit, screen/entry point and the browser's last-used tutorial version
(if recorded since this release). Tutorial context is client-reported, with the
experiment assignment checked in production. General comments may have no puzzle
context. A finish that has not yet reached the server is marked as not recorded.

Player status is derived from the earliest server game session for that browser,
using an index on `(player, started_at)`. `first_day` means its first daily OR
practice game was on the submission's UTC day; `returning` means an earlier UTC
day; `not_yet_played` means there is no recorded game session. This follows the
period report's all-game definition (the Today daily-only panel has its own
mode-specific cohort). Status and first-play date are frozen at submission.
Clearing browser storage or changing devices creates a new identity; historical
play before server tracking cannot be reconstructed.

The game migration adds indexed feedback receipts and the session time index.
Each browser may send three new submissions per rolling 24 hours, in addition
to the existing per-IP API rate limit. The quota check, receipt and outbox entry
commit atomically. A stable submission ID makes retries idempotent, including
when a saved response is lost. Unconfirmed retries keep their original payload.
The outbox forwards feedback through the existing authenticated service binding
to `/ingest-feedback`, retrying on API activity and the five-minute cron. Receipts
remain after delivery for deduplication; comments live in the analytics database
(and temporarily in the game outbox). Existing retention policy applies.

The analytics migration adds a separate `feedback` table and an environment/time/ID
index. Owner-only `/api/feedback` serves at most 30 items per page with an indexed
cursor, never scanning events or counting all submissions. **Player feedback**
in the dashboard loads only on request, uses the selected environment and period,
shows text safely, and can download loaded submissions as JSON. The standard
stats export and automatic report refresh do not include or read feedback. Daily
and practice context remain labeled separately; no migrations rewrite gameplay
history. Production deploy applies analytics first, then the API, then Pages.


Today/Yesterday include `feedback_count` in the cached report and JSON export.
The count covers all submissions (daily, practice and general), by submission UTC
date, not delivery date. `feedback_daily_counts` is updated by an INSERT trigger;
duplicate delivery cannot increment it. The migration seeds existing feedback
once. A cold report reads at most two counter rows, and warm reports retain their
existing read budget with no feedback query. Counts can lag by up to five minutes,
like other cached metrics; UTC rollover reassigns Today/Yesterday automatically.
Comments remain private and load only on request. This counter assumes feedback
is immutable, as the current API enforces; any future editing/deletion feature
must also maintain these counters.

## Daily player trend

`player_trend` contains a seven-day simple moving average of daily unique players,
using the same daily-plus-practice scope as the existing daily chart. Each point
averages its labeled UTC day and the preceding six days; all seven must be
completed tracked days. Today, tutorial activity and dates before first recorded
tracking are excluded. Quiet days within tracking count as zero. The first
tracked date remains the existing first-activity proxy, so initial collection
may have started partway through that day.

The calculation uses retained summary facts, including the six days before the
selected period where needed. A given date's value therefore stays the same
across 7/28/90-day filters. The trend does not divide period-wide unique players
by seven: a returning browser contributes once on each day it plays. Until seven
tracked days have completed, the dashboard shows an explanatory empty state.

The line chart includes a zero-based scale, latest weekly average, exact date
range and hover/tap/keyboard details. It is built into the existing cached report
and JSON download, without new queries, migrations, dependencies or comment reads.
