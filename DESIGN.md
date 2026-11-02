# Squeek Holder Bot design

## Overview

A landing page for Squeekchain holders who want Telegram alerts, followed by a live read-only chain panel. The existing dark canvas, lime emphasis, mint links and pocket headline remain the visual identity. The main Telegram action precedes the live panel and feature reference. Source of truth: `public/index.html`; `dist/index.html` is its byte-identical production export.

## Colors

All tokens live in `public/index.html:18` and retain the project's hexadecimal notation.

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0b0b10` | Page; primary action text |
| `--panel` | `#14141c` | Live panel, feature cards, command rows, skip link |
| `--line` | `#262633` | Structural separators, card borders, progress track |
| `--text` | `#e9e9f2` | Headings, primary text, secondary controls |
| `--muted` | `#9a9ab0` | Supporting text, labels, secondary control boundaries |
| `--accent` | `#c9f24d` | Primary action, headline highlight, progress, connected dot |
| `--accent-2` | `#7de2d1` | Text links |
| `--focus` | `#7de2d1` | Keyboard focus outline |
| `--warn` | `#ffcf66` | Delayed or unavailable dot, accompanied by status text |

The security callout uses `#141a12` with `#d9e8bf` text. This page has one dark appearance; there is no theme toggle or alternate palette. Rendered contrast from the design probe at 390px: lead on page 7.13:1, primary action 15.23:1, muted labels on panel 6.65:1, main panel text 15.18:1. These are the measured solid pairs, not a blanket accessibility certification.

## Typography

System sans stack: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`. No web font download is required. Commands use `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. Requested weights are 400 and 700; the actual system face depends on the visitor's platform.

| Role | Size | Line height |
| --- | --- | --- |
| Supporting text, command code | 14px | 1.6; live detail inherits 1.4 |
| Body, actions, feature headings, live heading | 16px | 1.6; live heading 1.3 |
| Desktop lead; live values | 19px | 1.6; values 1.4 |
| Section headings | 22px | 1.3 |
| Mobile headline | 34px | 1.05 |
| Desktop headline | 58px | 1.05 |

Headlines use `-.02em` tracking and balanced wrapping; section headings use `-.01em`. Other copy has natural spacing. The headline is limited to 17ch and the lead to 54ch. Live numbers use tabular numerals. Critical data wrap rather than clip. The compact minted amount exposes a more precise formatted amount through its title attribute; no financial action depends on that tooltip.

## Layout

`.wrap` has a real `max-width:1040px`, centered with 24px inline padding, reduced to 16px at 420px. The spacing vocabulary is 4, 8, 12, 16, 24 and 40px (`--s1`–`--s6`), with 20px panel insets and 32px section separation on narrow screens. Current rules use these numeric values directly; the spacing tokens are reference values rather than a separate theme system.

Content order is header, compact headline and actions, live panel, features, commands, setup steps, security, footer. Reading and visual order agree. Navigation wraps below the brand on narrow screens and remains available.

- Above 800px: three feature columns; four live data columns; two command columns.
- At 800px: two feature columns; the redundant header GitHub link hides (View source and footer source links remain).
- At 660px: 34px headline, 16px lead, wrapping header; two live columns; one command column.
- At 420px: one feature column; 16px page and live-panel insets.

Grids use `minmax(0,1fr)`. Actions and live footer wrap. The preview was checked at 320, 390, 660, 800 and 1440px; the 390×844 first screen contains the product, Telegram action and live values. RTL reflow and 200% CSS text enlargement were checked at 390px; native browser zoom and physical devices were not checked.

## Elevation & Depth

Flat tonal surfaces with structural 1px borders. No shadows, nested cards, gradients or floating persistent controls. The live panel is a single surface; its data cells have no separate boxes. Focus is a 2px mint outline with a 4px offset, changing to the system Highlight color in forced colors.

## Shapes

`--radius:14px` is used on panels and cards. Actions use 11px, command rows and security callout 10px, refresh 8px. The 34px brand mark is an inline wheel SVG. The progress track and status dot are rounded. Text containers grow with content; no critical text is clipped.

## Components

| Pattern | Source | Behavior and states |
| --- | --- | --- |
| Brand and navigation | `public/index.html:129` | Brand returns to main; section links use hashes; native keyboard navigation |
| Skip link | `public/index.html:127` | First Tab stop; appears on keyboard focus and jumps to main |
| `.btn-primary`, `.btn-ghost` | `public/index.html:50` | One filled Telegram action; outlined source action; at least 48px tall; hover, focus and pressed feedback |
| `.live` | `public/index.html:150` | Named section and definition list; loading, success, delayed sensor, partial failure, stale retained data and unavailable states |
| `#live-refresh` | `public/index.html:165` | Native button, at least 44px; disables and reads Refreshing during a request; returns to Refresh now after completion or timeout |
| `#live-feedback` | `public/index.html:164` | Stable polite status region; explains failures and retry; text redundantly communicates dot status |
| `#live-bar` | `public/index.html:162` | Native progress, labeled percentage; indeterminate while status is unavailable |
| `.card`, `.cmd` | `public/index.html:59` | Static feature descriptions and wrapping command reference; not fake clickable cards |
| `.steps`, `.callout` | `public/index.html:67` | Native ordered onboarding list and read-only security explanation |

The live script starts at `public/index.html:229`. Both endpoints refresh every 10,000ms with an 8,000ms timeout, independently handled results and no overlapping refreshes. Unknown or malformed data are rejected rather than replaced with invented zero values. `IDLE` displays Resting and 0 rpm. The disabled refresh and error copy explain recovery next to the panel. No wallet connection, signing flow, form, modal or persistent user data is part of this site.

Hover effects only apply to hover-capable pointers. Button press scales to `.96` with a 150ms `cubic-bezier(.2,0,0,1)` transition only when reduced motion is not requested. There are no continuous animations.

Assets: `public/assets/favicon.svg` is a reusable wheel mark; the head embeds an equivalent favicon as a data URL so single-file hosting works. `public/assets/share.png` is the 1200×630 local share card. All page CSS and JavaScript are inline; the relative share-image URL also works through the optional gateway worker's image route.

## Do's and Don'ts

- Reuse `.wrap`, the six existing type sizes, semantic colors and native controls when adding a section.
- Keep the Telegram action visible before supporting content; use the outlined action for peers.
- Use existing panel and row patterns for comparable content. Keep live values tabular, wrapping and labeled.
- Pair every connection color with text. Preserve unavailable, stale and retry states when changing data sources.
- Keep paths relative for exported assets and use hashes for section navigation. Rebuild after source changes.
- Add a section with an `h2`, short plain description and existing grid/row pattern, then check it at 320, 390 and desktop widths. Do not add fonts, animation or a wallet connection merely to decorate it.

Design guidance applied from Jakub Krehel's Better Interface (MIT, pinned commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`); documentation method adapted from Paul Bakaus's Impeccable (Apache-2.0, pinned commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`). Attribution and license texts are retained in `docs/design-guidance-LICENSE`.
