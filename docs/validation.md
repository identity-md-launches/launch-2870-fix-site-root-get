# Static mirror validation

Reviewed 2026-11-02. **Complete for the static-site scope.** Build, strict
frontend typecheck, meaningful Chromium interactions and local HTTP acceptance
pass. This is the contributor's recorded validation, not independent verifier
certification or a claim that this export has been deployed.

## Scope and source

The reference is upstream master
[`ad869b547c3b123df946c060dd5c07711134bc4a`](https://github.com/DinhTienhz/squeek-holder-bot/commit/ad869b547c3b123df946c060dd5c07711134bc4a).
Its `public/index.html` and the published worker page were fetched and compared:
identical before local corrections. The five requested images were fetched from
that exact revision and match the delivered bytes. No remote CSS, fonts or
JavaScript are needed at runtime. Public API calls remain external.

`public/` is the requested source/site root. `dist/` contains the same six runtime
files. The HTML includes all CSS and JavaScript and can be served without a
build. The optional build only validates and copies files. Existing bot source,
dependency manifests/lockfile, deployment files and protected paths were not
changed. The static export does not use the legacy deployment files.

The visual idea is the original gold dotted mark and lime Telegram action over
a dark page, with a live Squeekchain panel and concise feature/command grids.

## Brief requirements

| Requirement | Result / evidence |
| --- | --- |
| “mirror it, do not redesign it” | Met: upstream copy, sections, palette, fluid layout, responsive structure and images preserved; functional/accessibility changes below |
| “public/ as the site root” and inline single-file HTML | Met: `public/index.html`, no external script/stylesheets; matching `dist/index.html` |
| “GET / returns 200” with exact title, no listing | Met locally: `/`, `/index.html`, `/preview/`, `/preview/index.html` all serve exact source with HTML MIME |
| Exact header logo next to product name | Met: `public/index.html:125`; actual PNG decoded at 512×512 |
| Exact Telegram destination, new tab | Met: `public/index.html:144`; actual click opened intercepted destination in a popup, with null `opener` |
| Status 10s and economy 60s | Met: `public/index.html:252`; simulated clock records counts 1:1 initially, 2:1 at 10s, 3:1 at 20s, 6:1 at 59.999s, 7:2 at 60s |
| Real numbers, retain values on error | Met: real API HTTP 200 readings plus explicit fixture-driven retained-value checks |
| “data unavailable” after 60s | Met: separate feed timestamps; no stale label at 59s, stale label by 61.001s, all prior values retained |
| Refresh disables and restores its label | Met: real clicks and simulated hanging requests; 8s abort, no duplicate requests, `finally` restores button |
| All 18 commands in four groups | Met: `public/index.html:185`; includes added `/start` in Other (upstream had only 17 rows) |
| Feature five “Hamster alerts” | Met: `public/index.html:178`, starts **or** stops, RPM, `/hamster` |
| Canonical / Open Graph / Twitter | Met: requested worker URL preserved; canonical occurs once, full required metadata present |
| Required five asset names and relative URLs | Met: all five assets HTTP 200 at root/subpath, PNG/ICO signatures valid, bytes match upstream |
| `/logo-mark-32.png` HTTP 200 image/png | Met: root and subpath GET verified, including cache-busting query |
| No other bot username / placeholder / unfinished copy | Met: production build checks the HTML; requested Telegram URL and `/hamster on\|off` each appear on one line |
| First screen at 390 | Met: product, logo and primary action fit in 390×844; screenshot viewed |
| Production export, source, existing lockfile | Met: six-file `dist/` included; original root package/lockfile preserved |
| Build, typecheck and useful interaction validation | Met: commands and actual results below |
| Better Interface review, DESIGN.md and README | Met: six domains reviewed; findings fixed; exceptions and unperformed checks explicit |
| No deployment/backend/contract work | Met: this delivery only changes static frontend, validation helpers and documentation |

## Better Interface coverage

All six core domains and the documentation workflow were read from the pinned
Better Interface input. Wallet connectors were reviewed as **Not applicable**:
this landing page has no signing or wallet-connection task.

| Domain | Coverage and evidence | Unperformed / not applicable |
| --- | --- | --- |
| Accessibility — Checked | Native links/button, skip to main, names/roles, heading outline, ordered setup list, status announcements, semantic progress, empty image alt beside name, visible mint focus ring; keyboard flow; minimum 44px interactive targets; axe A/AA at 390 and 1440; reduced motion | Screen-reader session, native zoom and physical touch devices not verified. Forms, dialogs, focus traps and destructive actions not applicable. |
| Layout — Checked | DOM order, shared 22px edges, wrapping grids/commands, eight tested widths; 320/390/1440 probe finds no overflow/overlaps/clipping; 390 first screen screenshot; RTL and 200% CSS text enlargement | Native 200% browser zoom not verified; RTL is reflow coverage, not translated-product support. |
| Writing — Checked | Upstream voice and copy preserved, exact Telegram account, all 18 commands, action labels match behavior, no fabricated live data, loading/error/retry labels verified | Delivery of actual Telegram alerts not verified; no marketing copy rewrite because the brief requests a mirror. |
| Typography — Checked | Original system/monospace families and hierarchy, weights 400/700, `60ch` lead, unitless line height, tabular live digits; realistic command/supply wrapping; 200% text test | No custom fonts exist. Upstream sizes and tracked caps intentionally exceed the house style bar. |
| Colors — Checked with limits | Existing hex roles reused, status has redundant text; four solid pairs measured from browser-computed styles, all over 4.5:1; automated solid-pair contrast passes | Probe skips 94 gradient/image-backed text boxes; axe contrast incomplete for 45 nodes at 390 and 48 at 1440. Full gradient contrast verification and physical forced-color testing not performed. No light theme exists. |
| UI — Checked | Original card/badge/callout/radius language preserved; real/simulated rest, loading, success, failure, retry, retained data, timeout and focus; explicit short transitions; press scale `.96`; reduced-motion overrides | Animations panel at 10% speed not inspected; hover/press coverage uses Chromium, not physical devices. WebKit launch unavailable. No modal/tooltip/stateful form exists. |

Measured solid contrast pairs from rendered styles:

| Pair | Colors | Ratio |
| --- | --- | --- |
| Primary button | `#0b0b10` on `#c9f24d` | 15.23:1 |
| Muted card description | `#9a9ab0` on `#14141c` | 6.65:1 |
| Command code | `#c9f24d` on `#14141c` | 14.21:1 |
| Security callout | `#d9e8bf` on `#141a12` | 13.69:1 |

## Findings, corrections and rechecks

Source locations refer to final `public/index.html`, not the generated copy.

| Severity / root cause | Location, reproduction and impact | Correction and recheck |
| --- | --- | --- |
| High: outdated source omitted required content/assets | Previous workspace page had an inline wheel icon, an incorrect bot link, 12 commands and a status-only feature five | Restored pinned upstream HTML and actual logo/OG assets; exact account and metadata preserved; added missing `/start`. Build, rendered content and asset GET checks pass. |
| High: hanging refresh | `:297`, `:390`, `:408`: upstream fetch had no timeout; a non-settling request could strand the disabled button | 8s AbortController timeout, per-feed promise deduplication and `finally` restoration. Initial/manual hanging reads and disabled clicks checked; label returns to Refresh now. |
| High: misleading source freshness and malformed readings | `:319`, `:338`, `:357`: upstream used one status timestamp, ignored economy errors and defaulted missing numeric fields to zero | Independent source timestamps, 1s age check, atomic validation and retained readings. Both complete and partial outages become data unavailable after 60s; malformed payloads do not paint zeroes. |
| Medium: idle wheel missing its real value | `:330`: upstream showed an em dash when idle | Validated RPM shown for both states. Real idle value 0 rpm and simulated running 12.35 rpm verified. |
| Medium: narrow grid overflow | `:69`, `:74`, `:75`, `:98`: fixed minimum command columns can exceed the 276px content width at 320 | Grid minimums respect available width; row/code/footer wrapping added. Probe and eight-width reflow checks pass. |
| Medium: enlarged primary action overflow | `:60`: at 390 with 200% CSS text, the username made a 405.22px button and page scrollWidth 427px | `max-width:100%` and `overflow-wrap:anywhere`. Same enlargement check passes after rebuild. |
| Medium: focus, targets and semantic feedback | `:46`, `:99`, `:122`, `:150`, `:161`, `:166`, `:227`: upstream had no skip link, compact refresh target, broad live announcements and invisible empty setup markers | Skip link, 2px focus ring, 44px refresh/navigation targets, stable status region, progress semantics and native numbered list. Keyboard run and viewed focus screenshot pass. |
| Medium: transition/reduced-motion coverage | `:107`, `:112`: generic shorthand transitions in upstream animated all changing properties; a first check read an in-flight transition immediately after preference switching | Named properties, 150ms easing, explicit reduced-motion transition overrides; test waits two paint frames for media application. Final reduced-motion check passes. |
| Low: footer link relied on color | `:116`: upstream footer GitHub link lacked a persistent underline | Added underline. axe link-in-text-block incomplete item cleared in final scan. |

## Pinned design probe: exact outcome and scope overrides

Command (using external Playwright):

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/squeek-tools/browsers IMD_PLAYWRIGHT=/tmp/squeek-tools/node_modules/playwright/index.mjs node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

Exit **0**, **10/16** checks passed. The probe returns zero when measurement
completes; that does not mean all checks pass. Passed: render, layout, targets,
contrast for measurable backgrounds, type-faces, slogans, repetition, chrome,
motion and share. [Recorded output](evidence/design-probe.json).

The brief says **“mirror it, do not redesign it.”** The following six measured
flags come directly from the requested reference, so they remain deliberate
scope overrides. They were inspected and are not mislabeled as passes.

| Flag | Source / measured finding | Disposition |
| --- | --- | --- |
| casing | `:55`, `:86`, `:92`, `:114`: ten uppercase content boxes | Preserve upstream labels |
| tracking | Same selectors: nine boxes above +.04em, up to .18em | Preserve upstream tracking |
| eyebrows | `:136`: one Squeekchain/Sepolia kicker above hero | Preserve upstream hero |
| type-sizes | `:44`, `:55`, `:56`, `:58`, `:65`, `:104`: nine repeated sizes, ten with one-offs | Preserve upstream hierarchy and `.92em` commands |
| glyphs | `:180`: em dash in Wallet activity description | Preserve upstream copy |
| copy-budget | `:138`: 109 prose words on first 1440 screen vs bar 90; mobile 35 vs bar 60 | Preserve upstream copy/density; mobile budget passes |

The product, primary action, layout, input target size and reduced-motion checks
have no outstanding applicable findings.

## Actual verification

| Command / check | Actual result |
| --- | --- |
| `node scripts/build-site.mjs` | Exit 0; 6 runtime files, 411,427 bytes, source/export byte equality |
| `node scripts/typecheck-site.mjs /tmp/squeek-tools/node_modules/.bin/tsc` | Exit 0; strict allowJs/checkJs/noEmit, ES2022 + DOM |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/squeek-tools/browsers node scripts/validate-site.mjs /tmp/squeek-tools test/scratch/final-verify` | Exit 0; **18/18 checks passed** in Chromium 145.0.7632.6 |
| `npm test` | Exit 0; **37/37** existing unit tests pass |
| Pinned taste command above | Exit 0; 10 pass, six mirror-style overrides as listed |
| axe WCAG A/AA at 390 and 1440 | No detected violations; incomplete contrast nodes explicitly retained |
| Real browser navigation/refresh | Exact page and assets HTTP 200, real API data visible, Refresh now returns enabled |
| Exact three requested occurrence counts | Checked by production build and final delivery audit: each equals 1 |
| Five assets vs pinned upstream | All bytes equal; hashes and export sizes in `evidence/site-build.json` |
| Final path and byte audit | See `evidence/delivery-check.json`; below 8 MiB, no protected-file/dependency/cache additions |

Real observed readings in the successful validation: state `IDLE`, rpmMilli
`0`, settled block `6808`, progress `305122472 / 1e9`, 18-decimal minted base
units `27092772850111401970492030`, cap
`2100000000000000000000000000`. The rendered readings were Resting, 0 rpm,
6,808 and 27.09M / 2.10B (1.29%), with next block 30.5%. These describe the
recorded run; no such observations are embedded as fallback data in the page.

The first interaction run found the text-enlargement overflow and a
media-switch timing issue; the source/test corrections above were rechecked.
The final suite passed all 18 checks. One separate long-running MCP status poll
reported `ERR_DNS_NO_MATCHING_SUPPORTED_ALPN`; subsequent polls returned 200 and
recovered without clearing values. No local resource failure or page exception
occurred during the final automated interaction run.

[Interaction results](evidence/interaction-results.json),
[accessibility results](evidence/accessibility.json),
[build hashes](evidence/site-build.json),
[mobile first screen](evidence/mobile.png),
[desktop first screen](evidence/desktop.png),
[visible refresh focus](evidence/keyboard-focus.png) and
[320px full page](evidence/mobile-320.png) are retained in the submission.
Mobile, desktop, 320px full-page and focus screenshots were opened and inspected. The pinned
probe also produced 390/1440 full-page screenshots in temporary scratch storage.
Final required files are outside scratch. No dependency installations, caches,
browser binaries, registry mirrors, CAR archives or tarballs are included.

## Limitations

WebKit was installed outside the repository but could not launch: its runtime
reported missing GTK4, Graphene, XSLT, GStreamer and other required system
libraries. Safari interactions therefore remain unverified. This was an actual
launch failure, not an assumed compatibility result.

No public deployment, social-platform unfurl, Telegram message delivery,
physical device, screen-reader session, native browser zoom or complete gradient
contrast audit is claimed. Local HTTP 200/root behavior, real API reads, Chromium
interactions, keyboard focus, reduced motion, RTL reflow and CSS text enlargement
were checked. Publishing is outside this static-only assignment.
