# Short tutorial experiment

Experiment: `tutorial-short-v1`. Production enrollment starts when this release
deploys. The dashboard reports its lifetime cohort independently of the selected
7/28/90-day reporting window.

## Question and variants

Does shortening the tutorial help new learners open their first real game?

- Control: the existing three lessons (CAT to DOG, CAT to OAR, COLD to WARM).
- Short: one CAT → TAR → OAR lesson, requiring one typed word. It teaches both
  replacing a letter and rearranging letters, and explains the prefilled end word.
- Both finish with the same “Play today’s puzzle” button and the same daily game.

The API assigns browsers 50/50 using a SHA-256 hash of the experiment ID and
existing anonymous player ID. No extra identity, database lookup, cookie or
runtime dependency is needed. The frontend freezes the assignment for an attempt.
Only an attempt actually using the assignment sends experiment metadata.

## Cohort and outcomes

Include each browser's first-ever recorded tutorial attempt if it is tagged with
this experiment and has no earlier recorded gameplay. Replays and previous players
are excluded from the primary comparison. Include learners who skip or abandon
the tutorial; do not condition the comparison on tutorial completion.

Primary: proportion opening any daily or practice game within 24 hours of their
tutorial start. This measures the handoff into gameplay, not puzzle mastery.
Only fully elapsed 24-hour windows enter either arm's denominator.

Secondary: tutorial completion, a completed game matched to a game opened in that
window, and gameplay on the next UTC calendar day. Next-day retention requires
that entire return day to have ended. These are diagnostic outcomes, not additional
ways to declare a winning experiment.

## Planned review

Review once both arms have at least 100 eligible learners and the experiment has
run for at least 14 days. Before then, monitor delivery, allocation, errors and
obvious usability problems, but do not select a winner based on repeated checks
for significance. Record any early operational stop as such.

At review, compare the primary proportions, report the absolute difference and
its 95% confidence interval, and use a two-sided test at alpha 0.05 (Fisher's exact
test is suitable). Use all mature enrollments at the planned review and report
their counts. The dashboard's per-arm Wilson intervals show uncertainty; their
overlap is not a significance test. Secondary outcomes are exploratory. An
inconclusive result remains inconclusive; any extension needs a new documented
analysis plan rather than checking daily until a favorable result appears.

The latest 28-day report had 65 mature first tutorials, including 18 previous
players: approximately 47 potential new learners, or 1.7 per day. At that rate,
200 learners take about four months. As an illustrative power calculation,
20% → 40% needs about 82 per arm for 80% power at two-sided alpha 0.05;
20% → 30% needs about 293 per arm. The new primary baseline is unknown:
the old tutorial-to-game metric required tutorial completion and is not equivalent.
Increasing relevant referral traffic can shorten the calendar time.

## Limitations and operation

Browser identities are not people. Clearing storage, incognito windows, other
devices and token expiration can create new identities. Historical records cover
only the period since tracking began. Missing or delayed telemetry can affect
eligibility and outcomes; late events are incorporated by the summary cache.
Offline or early-start tutorials without loaded configuration use the old tutorial
and remain untagged, so they are outside this experiment. Results apply to learners
who choose the tutorial, not every site visitor.

Migration `0002_tutorial_experiment.sql` adds nullable event columns. Existing
summary parts without experiment metadata remain valid, and no historical raw
event rebuild is needed. The trial aggregates existing summary facts and retains
the dashboard's D1 report cache. Old frontend clients remain compatible.

To stop new enrollment, set the game Worker `TUTORIAL_EXPERIMENT` value in
`scripts/production-config.mjs` to an empty string and deploy through main.
Existing assigned attempts can still submit their outcomes. Existing reports
remain available. A manual Cloudflare variable edit is overwritten by deployment.
Preview environments allow `?tutorial-variant=control` or `?tutorial-variant=short`
for visual QA; those forced attempts are untagged. Production ignores this override.

Validation: 45 automated tests cover the prior API/cache behavior, stable
assignment, event validation and deduplication, cohort maturity, skippers, replays,
prior gameplay and late delivery. A real Chromium check completes both versions,
checks mobile layout and daily-game handoff, and verifies saved settings survive.
