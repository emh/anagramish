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
