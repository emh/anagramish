# Anagramish

The frontend remains plain HTML, CSS, and JavaScript at the repository root. Production is served by GitHub Pages at `anagramish.com`.

## Backend and analytics milestone

- `workers/game`: Cloudflare Worker for daily/practice/archive puzzles, server-side ladder validation, anonymous sessions, completion records, and a durable analytics delivery outbox.
- `workers/analytics`: separate Cloudflare Worker and D1 database for the owner-only analytics dashboard and authenticated event ingestion.
- `workers/game/data`: original dictionary and puzzle pairs. Preserve line ordering and count: the daily puzzle algorithm depends on them. They are bundled into the game Worker, not downloaded by the frontend.
- Each Worker has its own `db/schema.ts`, generated `drizzle/` migrations, and build script. No third-party runtime libraries are required.

The preview is deployed at `https://anagramish-preview.emh.chatgpt.site`; the private dashboard is at `https://anagramish-analytics.emh.chatgpt.site`. `.openai/hosting.json` in each Worker records its existing Sites project identity. Dedicated Sites checkouts currently mirror the root frontend and Worker source for publication; they are not the production GitHub Pages deployment.

## Development

Install dependencies with `npm ci` in both `workers/game` and `workers/analytics`. Run `npm run build` in each directory, then `npm test` in `workers/game` for both Workers' API/D1 integration tests. `npm run dev` from `workers/game` serves the game on `http://127.0.0.1:4173` and local analytics on `http://127.0.0.1:4174`. Local databases are disposable. Only the development wrapper injects a test owner identity.

The browser walkthrough is `workers/game/tests/browser.cjs`. Set `PLAYWRIGHT_MODULE` if Playwright is not normally resolvable and `CHROMIUM_PATH` to the installed browser. It covers saved games, cleared cookies, failed requests, completion sync, past puzzles, mobile layout, and analytics.

After schema edits, run `npm run db:generate` in the affected Worker and inspect the SQL. Never rewrite an applied migration. Builds emit ignored `dist/` output. Sites deployment archives contain `.openai/hosting.json`, `dist/`, and `drizzle/`, built from the pushed source.

## Runtime settings

Game: D1 `DB`, static `ASSETS` for the hosted preview, `TRAFFIC_ENV` (defaults to `preview`), `ANALYTICS_URL`, secret `ANALYTICS_SERVICE_TOKEN`, and secret `ANALYTICS_INGEST_TOKEN`.

Analytics: separate D1 `DB`, secret `INGEST_TOKEN`, and secret `ADMIN_EMAIL`. The current dashboard authorizes the owner using authenticated Sites headers. Ingestion requires both private Site access and its own shared secret. Keep secrets out of Git.

## Production architecture (not migrated yet)

Keep GitHub Pages at `anagramish.com`. Deploy the game API to `api.anagramish.com` and analytics to `analytics.anagramish.com` in the owner's Cloudflare account. Protect the dashboard with Cloudflare Access and authorize Worker-to-Worker ingestion separately.

Before merging/deploying this branch to production: configure frontend API origin, cross-origin requests and cookies; replace Sites-specific dashboard authentication/service access with Cloudflare Access verification; configure D1 bindings, domains, abuse controls, and data retention. The current same-origin `/api/` client is for the working preview; merging it directly into the current static production deployment would break API calls.

## Measurement limits

Daily puzzles keep the original browser-local dates; reports use UTC. Existing browser history is preserved, with no automatic upload of historical completions. A reopened unfinished game counts as activity on the day it is reopened. Events are idempotent and retained in an outbox through delivery failures; subsequent event-producing requests retry delivery.

Anonymous cookies estimate browsers, not people. Referrer paths and raw IPs are not stored; coarse location uses available Cloudflare request metadata. Preview traffic is separate from production. The preview's Clicky script is removed.

Ladders are server-validated, but times and mistakes are browser-reported. Do not use these as a verified leaderboard or publish competitive percentiles without strengthening the timing/comparison policy.

## Tutorial milestone

“Learn to play” opens three untimed, guided lessons: two three-letter puzzles for substitutions and rearrangement, followed by a four-letter ladder with optional hints. It reuses the game's keyboard and variable-size board, works without API connectivity, and supports skip/replay and a handoff to today's puzzle. Tutorial completion is a device-local onboarding preference; daily/practice history and hard-mode settings are preserved.

The `/api/tutorial` endpoint records separate, idempotent start/completion events. The analytics dashboard shows them separately from daily players and game results. `tutorial.mjs` contains the small authored lesson vocabulary, not the full game dictionary. Additional checks live in `workers/game/tests/tutorial.test.mjs` and `workers/game/tests/tutorial-browser.cjs`.
