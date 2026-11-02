# Website validation and handoff

Date: 2026-11-02. Final interaction run started at `2026-11-02T09:04:56.469Z`.
Source/export SHA-256: `f7b9532b4917da0695e5d3438e963bbcdeee602e5287bbb5a1849baf6dcbf849`.

## Scope and assumptions

Root-serving fix for the existing Squeek Holder Bot landing page, with the live
panel from verified master commit `ed8af27b4342500e53e364bf9e3ae724fe791974`. That commit changes only
`public/index.html`; its exact raw page was used as the implementation base.
The existing dark/lime/mint visual identity and Telegram destination were retained.
Backend logic and the existing dependency/build files were preserved. The browser
review used the actual `dist/` export at both root and a gateway-like `/preview/`
subpath. No wallet infrastructure applies to this read-only landing page.

The page is a Telegram alert product with one visual idea: a lime action and
headline on a restrained dark canvas, followed immediately by readable live data.

## Requirement coverage

| Requirement | Result | Evidence |
| --- | --- | --- |
| GET / returns the required HTML title with HTTP 200 | Met locally; public mapping pending | Root/subpath body equality check; `dist/index.html:6` |
| Publish public/index.html as a FILE CID | File DAG and CAR prepared; external pin/publication pending | `artifacts/site-root.json`, `artifacts/site-root.car` |
| Redirect if directory listing persists | Optional edge implementation supplied; deployment pending | `deploy/site-root-worker.mjs`, `artifacts/site-root-worker.mjs` |
| Latest master live panel | Met | Master `ed8af27`, real API observations in interaction report |
| Live values replace unavailable placeholders | Met with working APIs | Real browser values: Resting, 0 rpm, block 6,808, 27.09M SQK |
| Working primary interactions and responsive layout | Met for tested Chromium scope | 14 checks; mobile/desktop screenshots |
| Source, preserved lockfile and dist export | Met in submission files | `public/`, existing `package-lock.json`, `dist/`; inline runtime and relative image URL |
| Production build, typecheck, interaction validation | Met | Build, strict JS checking and 14 passed checks |
| Better Interface six-domain application and review | Met within recorded coverage | Table below; corrected source locations |
| Product/main action on first screen at 390 | Met | `artifacts/mobile.png`; primary action bottom approximately 348px in 390×844 viewport |
| Title, icon, description, og:title, og:image | Met | Head metadata and image HTTP 200; social crawler unfurl unverified |
| DESIGN.md and README install/preview/rebuild | Met | Root documents |

No feature is represented as fabricated live data. Test fixtures are explicitly
simulated in the validation script and do not appear in the production page.

## Six-domain review

| Domain | Coverage | Evidence and limitations |
| --- | --- | --- |
| Accessibility | Checked | Native anchors/button/progress/list, semantic names, skip link, keyboard path and visible focus, polite status; axe A/AA 0 violations and 0 incomplete. Screen-reader sessions and physical devices not verified. |
| Layout | Checked | Root and subpath inspected; overflow checked at 320/390/660/800/1440, screenshots at mobile/desktop, RTL and 200% CSS text enlargement at 390. Browser-native zoom not verified. |
| Writing | Checked | Six-word existing headline, one plain product sentence, verb-first actions, explicit unavailable/stale/retry copy. Bot messaging availability is outside the verified browser flow. |
| Typography | Checked | Five sizes per rendered viewport, six sizes across breakpoints, two families/weights, tabular live values and wrapping command rows. System fonts vary by platform; no downloadable font loading is claimed. |
| Colors | Checked | Probe measures solid foreground/background pairs. Minimum observed muted panel pair 6.65:1; primary action 15.23:1. Dark theme only; alternate themes not applicable. |
| UI | Checked | Hover/focus/pressed/disabled/loading/success/failure/retry states reviewed; native progress and static status text; no continuous animation or transition:all. Slow-motion Animations-panel inspection was not performed. Dialogs/forms/wallet states are not applicable. |

## Findings, corrections and rechecks

All locations below refer to final source, not generated bundles.

| Severity / domain | Source and finding | Correction and recheck |
| --- | --- | --- |
| High / root serving | `scripts/build-site.mjs:1`: supplied project had only `public/index.html` and no production entry at `dist/index.html` | Export places the exact HTML at top level, carries assets, computes a file DAG and supplies a root proxy. Local root, index and subpath all return 200 and exact source bytes; public mapping remains pending. |
| High / live functionality | `public/index.html:279`: master panel needed to be carried into the older checkout; its resting RPM used an unavailable dash and supply refreshed every 60s | Live IDs retained, actual zero RPM displayed, both endpoints run every 10s. Real API panel values observed; simulated clock verifies both requests. |
| High / UI and writing | `public/index.html:314`: master silently swallowed supply failures and did not provide recovery or an 8s timeout | Separate request results, explicit unavailable/stale messages, retained values, disabled request state, Refresh now and timeout. All five failure/poll/recovery checks pass. |
| Medium / layout | `public/index.html:39`: original `.wrap` used invalid `max:` instead of `max-width`, and long command rows could outgrow narrow grids | Correct 1040px maximum; minmax(0,1fr), wrapping rows and responsive columns. Probe reports no horizontal scroll, text overlap or clipping at 320/390/1440. |
| Medium / writing and typography | `public/index.html:141`: original tracked capital kicker, long introduction and inconsistent label sizes diluted the first mobile screen | Kicker removed, one plain sentence retained, natural-case live labels and one six-size scale. Probe reports 16 prose words on the first phone screen and 5 sizes at each measured width. |
| Medium / accessibility | `public/index.html:35`: original source had no explicit keyboard focus rule or skip navigation | 2px mint outline with 4px offset, native skip link and named navigation. Real keyboard path, focus ring, action activation and axe rechecked. |
| Medium / share metadata | `public/index.html:11`: no og:image or favicon in original/master page | Inline favicon and local 1200×630 PNG; metadata probe passes and relative asset loads under `/preview/`. Public/social unfurl remains unverified until publishing. |
| Medium / UI and motion | `public/index.html:73`: master used a continuously pulsing dot and mixed gradients; feedback was color-heavy | Flat existing palette, static dot plus explicit text, restrained opt-in press feedback. Reduced-motion check and probe motion/chrome checks pass. |

## Actual verification

| Command/check | Actual result |
| --- | --- |
| `node scripts/build-site.mjs` | Exit 0, 21,061-byte HTML and complete export generated |
| `node scripts/typecheck-site.mjs <external-tsc>` | Exit 0, strict TypeScript allowJs/checkJs/noEmit, ES2022 + DOM |
| `node scripts/validate-site.mjs <external-tools>` | Exit 0; 14/14 checks passed in Chromium |
| Pinned `taste.mjs --out test/scratch/taste` | Exit 0; all 16 checks passed with unchanged probe and Chromium launch adapter |
| axe WCAG A/AA | 0 violations, 0 incomplete; `artifacts/accessibility.json` |
| `npm test` | Exit 0; all 37 existing tests pass |
| `ipfs-unixfs-importer` comparison | HTML and PNG file CIDs both match, cidVersion 1, rawLeaves false, no directory wrapper |
| `@ipld/car` independent reader | CAR decodes with exactly two expected roots and two blocks |
| Browser console and requests | MCP browser showed 0 errors/warnings; real API reads HTTP 200; local export and image HTTP 200 |
| API curl | Both status/economy endpoints HTTP 200 with Access-Control-Allow-Origin: * |
| Public site curl | Three attempts at 08:54 UTC failed with curl 35, tlsv1 alert internal error, HTTP 000 |

The interaction report records actual API response timestamps and selected source
fields. Successful observations include `IDLE`, `rpmMilli=0`, settled height
`6808`, progress `305122472/1e9`, minted base units
`27092772850111401970492030`, cap `2100000000000000000000000000`, and 18 decimals.
Those observations describe the recorded run and are not hardcoded into the site.

The default Playwright headless shell initially returned
`browserContext.newPage: Target crashed`. Re-running the unchanged probe with the
full downloaded Chromium channel and `--no-sandbox --disable-dev-shm-usage`
completed all measurements. Playwright and test dependencies/browsers were kept
outside the repository. The first temporary npm cache had an EACCES error; using
fresh task-specific temporary directories resolved installation.

Initial interaction-test runs exposed assumptions in the test's keyboard order:
programmatic focus after mouse navigation does not establish :focus-visible, and
hash navigation moves the sequential Tab starting point. The final check uses
the actual keyboard flow from the skip link before testing the section link; all
14 checks pass. No page error or keyboard defect was hidden by the correction.

Evidence files: `artifacts/interaction-results.json`,
`artifacts/design-probe.json`, `artifacts/accessibility.json`,
`artifacts/mobile.png`, `artifacts/desktop.png`, `artifacts/mobile-focus.png` and
`artifacts/mobile-320.png`. The final mobile/desktop, focused refresh and 320px
full-page screenshots were viewed. Raw probe screenshots and temporary
scaffolding live in `test/scratch/` and are excluded from submission.

## Remaining limitations and completion

**Incomplete only for external publication/public-root acceptance.** The repository
implementation, export and available local checks are complete. The files are
ready for the assignment's publisher. No supplied capability can pin to the
requester's account or update its site/ENS mapping, so no public publication is
claimed. `hosting.publishedFileCid` is deliberately null and root verification
false in the manifest. Bind the documented file CID or supplied edge worker,
then perform the README's public-root check.

WebKit `browserType.launch` reported that required runtime dependencies were
unavailable. Safari behavior, physical devices, screen-reader sessions, native
200% zoom and third-party social previews were not verified. Telegram link
navigation was checked with an intercepted destination and a separate public
contact-page fetch; receiving alerts and bot account operation were not verified.

The image is relative in metadata. A directory export resolves it directly;
file-root hosting must also use the supplied image route. A bare single-file
IPFS URL has no sibling asset path.

No fabricated live values, pin receipts, credentials, transactions, deployment
results or screenshots are included. No private machine configuration was read
or copied. Protected dependency files and existing build configuration were not
changed. Final file validity and bundle-size checks are recorded in
`artifacts/delivery-check.json`.
