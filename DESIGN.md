# Implemented design

## Overview

Squeek Holder Bot is a Telegram alerts landing page for Squeekchain holders.
This implementation mirrors upstream master `ad869b547c3b123df946c060dd5c07711134bc4a`
and its published page: gold dotted logo, dark background, lime headline and
primary action, live chain panel, eight feature cards, grouped commands,
three setup steps and a security callout. It preserves the original copy and
section order. The source is the single inline page `public/index.html`; `dist/`
is its byte-identical static export.

The request's “mirror it, do not redesign it” direction takes precedence over
house preferences for fewer type sizes, sentence-case labels and shorter copy.
Only accessibility, narrow-screen reflow, the missing command and live-data
reliability were corrected. Findings and evidence belong in
[docs/validation.md](docs/validation.md).

## Colors

All tokens are in `public/index.html:28` using the upstream hex notation.
The site has one dark appearance, without a theme control.

| Token/value | Implemented role |
| --- | --- |
| `--bg: #0b0b10` | Page base and dark text on the primary button |
| `--panel: #14141c` | Feature cards, command rows, skip-link background |
| `--line: #262633` | Structural borders, dividers, secondary button border |
| `--text: #e9e9f2` | Headings and main text |
| `--muted: #9a9ab0` | Descriptions, labels, captions and refresh border |
| `--accent: #c9f24d` | Primary fill, headline highlight, command text, running state |
| `--accent-2: #7de2d1` | Links, focus ring and progress gradient endpoint |
| `--warn: #ffcf66` | Resting or delayed-sensor dot, accompanied by text |
| `#1b1b28` | Page radial highlight, 1200×600px centered at `50% -200px` |
| `#161622` → `#111119` | Vertical live-panel gradient |
| `#20202c` | Progress track and numbered feature badge background |
| `#141a12`, `#2b3a20`, `#d9e8bf` | Security callout fill, border and text |

Four solid pairs were measured from rendered computed styles: primary button
15.23:1, muted card text 6.65:1, command text 14.21:1 and callout text 13.69:1.
These are WCAG luminance ratios. The automated gradient exclusions are described
in validation; a full gradient contrast certification is not claimed.

## Typography

The system sans stack is `ui-sans-serif, system-ui, -apple-system, "Segoe UI",
Roboto, Helvetica, Arial, sans-serif`. Commands use
`ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. No font files or font
services are needed. Normal and bold CSS weights are 400 and 700; the installed
system font supplies the face.

| Role / selector | Size and behavior |
| --- | --- |
| Body | `16px`, unitless `1.6` line height |
| Hero `h1` | `clamp(34px, 6vw, 58px)`, `1.05` line height, `-.02em` tracking |
| `.lead` | `clamp(16px, 2vw, 19px)`, maximum `60ch` measure |
| Section `h2` | `22px`, `-.01em` tracking |
| `.sub`, `.card h3` | `15px` |
| Card/command descriptions and navigation | `14px` |
| `.note`, footer and step numbers | `13px` |
| Live labels, command groups, badges, refresh text | `12px` |
| `.live-item .v` | `19px`, 700, tabular numerals, complete wrapping |
| `code`, `kbd` | `.92em` relative to surrounding text |

At 520px and below the live title becomes 12px and its timestamp 11px.
The original kicker uses 13px uppercase text with `.18em` tracking. Command
headings use `.16em`, live labels `.08em`, and the live title `.04em` (small
screens `.03em`). These deliberate upstream treatments remain part of the mirror.
The rendered probe counts nine repeated sizes plus one-offs; no six-size claim
is made. Critical commands and data wrap instead of clipping or ellipsizing.

## Layout

`.wrap` follows the published fluid layout with 22px side padding at every
width. Upstream's invalid `max` declaration had no rendered effect and was
removed; its unused `--max` token remains for source fidelity. There is no active
1040px content cap. Do not introduce one when extending this mirror.

Header padding is `22px 0 8px`, with a 10px brand gap and 38px logo. The desktop
hero uses `56px 0 26px`; at widths up to 560px its top padding is 34px and the
navigation is hidden, matching upstream. The primary action and product remain
visible on the first 390×844 screen. CTAs wrap with a 12px gap and stay within
page margins, including at 200% CSS text enlargement.

Sections use 40px block padding and a top divider. Feature grids use a 14px gap
and auto-fit columns with a 240px preferred minimum. Command grids use an 8px
gap and 280px preferred minimum; both minimums can shrink to the available width.
Command rows wrap code and description with a `4px 12px` gap. At 320 and 390 the
feature and command grids use one column; at 1440 they use five and four columns
respectively. The live grid auto-fits 150px columns with a 14px gap, yielding one
column at 390 and four at desktop widths. The live footer can wrap at 380px and
below. Footer content wraps with a 14px gap.

Rendered reflow was checked at 320, 390, 520, 560, 561, 800, 1024 and 1440.
RTL and 200% CSS text enlargement were checked at 390. Native browser zoom,
physical devices and full localization were not checked.

## Elevation & Depth

The original radial page glow and vertical panel gradient establish depth.
Cards and command rows have structural 1px borders without shadows. The logo
has its original gold `drop-shadow(0 2px 10px rgba(240,180,60,.18))`; the status
dot has a 3px low-opacity ring. There are no overlays, floating action bars,
card-within-card surfaces or added decorative assets.

## Shapes

`--radius: 14px` is used on feature cards and the live panel. Primary/secondary
buttons use 11px, command rows and the callout 10px, refresh 8px, badges 7px,
and the progress track 99px. Feature badges are 22px squares; step numbers are
28px outlined circles; the status dot is 8px. Text containers grow with content.
Only the progress track and visually hidden status text intentionally clip.

## Components

All components are HTML/CSS patterns in `public/index.html`, without a framework.

| Pattern / source | Purpose and states |
| --- | --- |
| `.brand`, `.logo` (`:124`) | Gold image next to the product name; decorative empty alt because the adjacent text names it |
| `.btn-primary`, `.btn-ghost` (`:143`) | Telegram and repository links; actual hrefs, hover/focus/press feedback; primary opens a new tab with `noopener` |
| `.live` (`:150`) | Named region with four measurements, accessible progress, updated indicator and refresh action |
| `.btn-refresh` (`:164`) | Native button; minimum 44px height; loading disables and labels it `Refreshing…`; `finally` releases it on success, failure or timeout |
| `.card`, `.num` (`:173`) | Eight numbered feature summaries in original order |
| `.cmdgroup`, `.cmds`, `.cmd` (`:185`) | Four command groups containing 18 complete command rows; code remains selectable |
| `.steps`, `.step`, `.n` (`:227`) | Native ordered setup list with visible 1/2/3 markers |
| `.callout` (`:236`) | Read-only/security explanation and deletion command |
| `.skip`, `:focus-visible` (`:46`) | First keyboard stop skips to main; 2px mint outline offset 4px; system Highlight under forced colors |

The live script begins at `public/index.html:249`. It reads status every 10s and
supply every 60s; manual refresh reads both. Initial loading, successful, sensor
delay, retrying, unavailable and retained-stale states are implemented. Each
endpoint has its own freshness timestamp and pending promise. An 8s abort bounds
requests, and a 1s age check marks values unavailable after 60s without a
successful update. Values are retained while the page remains open. Status
feedback is a stable polite live region; visible timestamps do not cause the
whole data panel to be announced on each poll. No wallet connection is present.

Button transitions name only filter, border-color, color and transform, using
150ms `cubic-bezier(.2,0,0,1)` and `.96` press scale. The original running dot
pulses over 2s and progress animates width over `.6s ease`. Reduced motion disables
these transitions and the pulse. No staged entrance animation was added.

## Do's and Don'ts

- Start with `.wrap`, the existing section spacing and the two existing button
  treatments. Keep the primary action lime and supporting actions outlined.
- Reuse the original colors, logo files, system fonts and grid patterns.
- Preserve the fluid desktop layout and the original mobile hero/copy hierarchy.
- Add command rows to a relevant group, keeping the complete code visible.
- Keep numbers derived from validated API responses. Never substitute a fake
  block, supply, RPM or username when a request fails.
- Keep local file references relative. Preserve the required absolute canonical
  and social metadata independently of where the static files are previewed.
- Any future page should reuse these patterns and hash links, include the same
  head metadata/assets and be exported explicitly; this static host has no
  application-server routing.

Design-review guidance: Jakub Krehel's Better Interface (MIT), pinned commit
`267330e1adfc66a718fb65fa6918c1f06d0a689e`. Documentation method: Paul Bakaus's
Impeccable (Apache-2.0), pinned commit
`9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`. This document applies that method to
the final implementation. Notices and both licenses are retained in
[docs/design-guidance-LICENSE](docs/design-guidance-LICENSE).
