# Anagramish SEO plan and measurement

## Status — 2026-10-06

Implementation is on the feature branch and private preview, not the public GitHub Pages deployment. The tutorial was already committed as `58a8642` before this milestone began.

The source audit found a generic `ANAGRAMISH` title, a useful description and canonical, an empty initial `<main>`, and instructions inside an inert template. No robots.txt or sitemap was present. A public-page text fetch on the audit date exposed the brand heading but not the instructions. This is evidence of a rendering dependency, not proof that Google has failed to index the page.

The owner has added anagramish.com to Search Console and reports almost zero inbound search traffic. Use approximately zero organic traffic as the owner-supplied starting assumption; collecting a historical export is not a launch prerequisite. Indexing status, impressions, clicks, CTR, rankings, and production conversion metrics have not been verified here. Keep measured values blank until reports exist. Private preview traffic cannot establish an SEO result.

## Changes in this milestone

- Render the existing welcome/rules content in the initial HTML and reuse it in the interactive app.
- Use a descriptive homepage title and description, preserving the production canonical and existing social image.
- Add a static, linked `/how-to-play.html` page with rules, a worked example, normal/hard-mode differences, and links into the game.
- Add accurate WebSite/WebApplication/WebPage structured data, with no invented ratings or reviews and no promise of a rich result.
- Add a two-URL production sitemap and robots.txt. Do not publish hundreds of empty daily-puzzle URLs.
- Keep non-production Worker responses `noindex, nofollow`; its robots.txt disallows crawling. Production GitHub Pages serves the repository's production robots.txt.
- Preserve acquisition source across the rules-page-to-game journey. A 30-minute sessionStorage record contains only campaign fields, referring origin, and landing path; no referrer path/query is saved.
- Classify recognized search-engine referrers as organic when explicit campaign tags are absent. The private dashboard counts distinct organic visitors, players, and finishers. These are approximate browser-based attribution metrics, not Search Console clicks. A guide-only visitor is not counted by the game analytics until they enter the game.

## Before production rollout

1. Complete the API/Cloudflare production migration described in the root README. Do not merge the preview's same-origin API client directly into the current GitHub Pages deployment.
2. Use the verified Search Console Domain property for `anagramish.com`, or create one with Google's prescribed DNS verification if needed. Keep the actual verification token out of this repository; no token has been invented or installed.
3. Start collecting Web search performance after launch. The accepted starting assumption is approximately zero organic traffic. Record actual report date boundaries/timezone, source property, and export date when measurements become available.
4. Record branded queries (containing “anagramish”) separately from non-branded queries. Initial topics to observe, not asserted high-volume keywords: “daily word ladder”, “anagram word game”, “five letter word ladder”, and “word ladder rules”. Use actual Search Console queries to refine them.
5. Establish a production analytics baseline if available. If the new backend is launched together with SEO, mark conversion data as a new series; it has no comparable pre-launch baseline. Do not mix Clicky counts, preview events, and the new anonymous-cookie counts as if they were identical.
6. Run mobile and desktop PageSpeed Insights against the public site. Record URL, date, test conditions, and lab versus field data separately. If field data is unavailable, mark it unavailable rather than substituting a lab score. Compare raw transfer size and responsiveness under the same test conditions.

## At production launch

- Record the deployed commit, launch date/time, and any simultaneous tutorial/backend or marketing releases in `changes.csv`.
- Verify the public homepage and rules page return 200 and retain canonical URLs on `https://anagramish.com/`. Check their rendered and non-JavaScript content.
- Verify `/robots.txt` allows the public pages and lists `https://anagramish.com/sitemap.xml`. The sitemap must contain only live canonical pages.
- Verify public responses have no preview `noindex` header. Keep the analytics dashboard and previews private/excluded.
- Submit the sitemap in Search Console, and inspect both URLs using URL Inspection. Request indexing where appropriate. Submission does not guarantee indexing.
- Verify an organic/referral test journey on production, clearly tag/remove test activity as appropriate, and confirm campaign tags take priority over inferred referrer source.

## Weekly review (manual; no automation scheduled)

Use `weekly-metrics.csv` for one row per completed seven-day reporting window. Compare equivalent weekdays and also use a 28-day view to reduce noise.

| Question | Measure | Source |
| --- | --- | --- |
| Can Google discover and index the content? | Indexing/URL Inspection and sitemap status for both pages | Search Console |
| Are more people finding the game? | Non-branded impressions and clicks; queries and landing pages | Search Console |
| Does the search result earn visits? | Clicks / impressions (CTR), segmented by query/page/device | Search Console |
| Are those visits becoming play? | Organic visitors, players, and finishers | Production analytics |
| Are new players returning? | Next-day/day-seven retention for eligible cohorts | Production analytics; currently overall, not organic-specific |
| Is the experience healthy? | Comparable mobile performance, API failures, usability | PageSpeed/field data when available plus application checks |

Search Console counts clicks, analytics estimates unique browsers, and their timezones/attribution differ. Do not expect those totals to match. Dashboard organic finishers count unique browsers with a completed game whose start was attributed to organic; they are not a strict same-day visitor-to-finisher cohort. Overall retention is not organic-channel retention.

## Review decisions

- Review indexing soon after launch; fix technical exclusions or broken URLs promptly.
- Assess acquisition trends over several weeks, not the day after a title change.
- When impressions rise but CTR is weak for relevant queries, adjust title/description to better match the page and search intent; record one change at a time where practical.
- When clicks/visits rise but play does not, inspect the landing-page/tutorial flow before purchasing more traffic.
- When relevant non-branded queries emerge, improve the useful rules/examples content rather than generating thin keyword pages.
- No ad campaign is started by this milestone. Budget, account access, and stop rules remain part of the paid-acquisition milestone.

## References

- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Search Console](https://search.google.com/search-console)
- [PageSpeed Insights](https://pagespeed.web.dev/)
