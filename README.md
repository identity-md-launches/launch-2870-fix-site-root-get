# Squeek Holder Bot

Static mirror of the [published Squeek Holder Bot site](https://squeek-holder-bot.chainn.workers.dev/),
rebuilt from [upstream master `ad869b5`](https://github.com/DinhTienhz/squeek-holder-bot/commit/ad869b547c3b123df946c060dd5c07711134bc4a).
The published HTML and that revision matched when fetched on 2026-11-02.
The upstream layout, copy, palette and five image assets are preserved. Small
accessibility and reliability fixes, plus the missing `/start` command, are
listed in [the validation report](docs/validation.md).

## Install, preview and rebuild the static site

**No frontend dependencies or build step are needed to serve the website.**
`public/index.html` contains all CSS and JavaScript. Serve `public/` as the site
root with directory indexing disabled and `index.html` as the default document.
The matching `dist/` export is included for static publishers.

For the optional export/preview scripts, use Node 24 or newer:

```bash
node scripts/build-site.mjs
node scripts/preview-site.mjs 4173
```

Open `http://127.0.0.1:4173/` or `/preview/`. Stop with Ctrl+C. Pass `0` instead of
`4173` to select an available port. You can also preview the source directly:

```bash
python3 -m http.server 4173 --directory public
```

Edit `public/index.html`, then run `node scripts/build-site.mjs` to refresh
`dist/`. This optional, dependency-free build checks required content, commands,
metadata and relative URLs, then copies the six source files without bundling or
rewriting them. It writes sizes and SHA-256 hashes to `artifacts/site-build.json`.
The final export is **411,427 bytes**, with a **24,551-byte** HTML entry.

```text
public/                 dist/                   (identical runtime files)
  index.html              index.html
  logo-mark.png           logo-mark.png
  logo-mark-32.png         logo-mark-32.png
  logo-180.png             logo-180.png
  favicon.ico              favicon.ico
  og.png                   og.png
```

Keep the sibling assets with the HTML. Local asset URLs are relative, including
`logo-mark.png?v=2`; hash links support gateway subpaths. Canonical, Open Graph
and Twitter metadata intentionally retain
`https://squeek-holder-bot.chainn.workers.dev/`, as requested. The existing root
`package.json` and `package-lock.json` belong to the bot and were preserved.
There is no frontend package installation, added wallet connector, backend or
deployment in this delivery. The legacy `deploy/` files are not used by the
static export or preview.

## Live panel

The browser reads the same public APIs as upstream:

- `https://api.squeekchain.com/v1/status`: immediately, then every **10 seconds**.
- `https://api.squeekchain.com/v1/economy/state`: immediately, then every **60 seconds**.

Refresh now requests both immediately. Requests have an **8-second timeout** and
are deduplicated per endpoint; the button is disabled while loading and always
returns to its original label. Both sources track their own successful update
time. On failure, last values remain in memory; after more than **60 seconds**
without a successful source update, the panel shows **data unavailable** within
the next one-second freshness check. A first-load failure shows Unavailable,
never invented zeroes. Automatic polling and manual retry recover the panel.
A genuine idle wheel displays `0 rpm`.

Supply uses integer base units before display formatting. These values are live
API reads, with no seeded or fallback numbers. Live data needs JavaScript and
public API CORS availability; the page includes a no-JavaScript API link.

The primary action opens the exact `SqueekHolder_Bot` Telegram account in a new
tab with `noopener`. All **18 commands** are grouped Wallets / Track /
Notifications / Other. Feature five explains start **and** stop Hamster alerts,
RPM and `/hamster`.

## Reproduce validation

The static build itself needs no packages. Optional checking tools can be
installed entirely outside the repository:

```bash
squeek_tools_dir=$(mktemp -d /tmp/squeek-tools.XXXXXX)
squeek_cache_dir=$(mktemp -d /tmp/squeek-cache.XXXXXX)
npm install --prefix "$squeek_tools_dir" --cache "$squeek_cache_dir" --no-audit --no-fund playwright@1.58.2 @axe-core/playwright@4.11.1 typescript@5.9.3
PLAYWRIGHT_BROWSERS_PATH="$squeek_tools_dir/browsers" "$squeek_tools_dir/node_modules/.bin/playwright" install chromium webkit
node scripts/build-site.mjs
node scripts/typecheck-site.mjs "$squeek_tools_dir/node_modules/.bin/tsc"
PLAYWRIGHT_BROWSERS_PATH="$squeek_tools_dir/browsers" node scripts/validate-site.mjs "$squeek_tools_dir" test/scratch/recheck
npm test
```

The optional third argument to `validate-site.mjs` selects the output directory;
it defaults to `artifacts/`. The validation script starts and closes its own
preview server and browser. It never starts the Telegram backend or sends a
message. Test-only API fixtures exercise failure states and a simulated clock;
none is shipped in the page. Keep installed packages and caches outside Git.

The pinned design probe was also run from the repository root:

```bash
PLAYWRIGHT_BROWSERS_PATH="$squeek_tools_dir/browsers" IMD_PLAYWRIGHT="$squeek_tools_dir/node_modules/playwright/index.mjs" node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

The `.imd/reads/` inputs are removed before submission; that exact probe command
requires the supplied contributor inputs. Its actual results are retained in
[docs/evidence/design-probe.json](docs/evidence/design-probe.json).

Actual final checks on 2026-11-02:

| Check | Result |
| --- | --- |
| Production export | Passed; source/export files match, all five assets match upstream bytes |
| Strict JavaScript typecheck | Passed using TypeScript `allowJs`, `checkJs`, `strict`, `noEmit` |
| Chromium interaction checks | **18/18 passed** |
| Existing unit tests | **37/37 passed** |
| Responsive widths | 320, 390, 520, 560, 561, 800, 1024, 1440: no horizontal overflow |
| 390 first screen | Product, logo and Telegram action visible; screenshot inspected |
| axe A/AA, 390 and 1440 | 0 detected violations; gradient contrast checks remain incomplete |
| Pinned taste probe | **10/16 passed**; six inherited visual/copy flags retained to honor “mirror it, do not redesign it” |
| WebKit | Launch failed because system runtime libraries were missing; Safari unverified |

The probe's six flags concern upstream uppercase labels, tracking, the kicker,
type sizes, em dashes and desktop copy density. They are documented scope
overrides, not claimed passes. All applicable functional findings were fixed.
See [DESIGN.md](DESIGN.md), [the six-domain review](docs/validation.md),
[interaction results](docs/evidence/interaction-results.json),
[mobile screenshot](docs/evidence/mobile.png) and
[desktop screenshot](docs/evidence/desktop.png).

Public hosting of this export, Telegram message delivery, physical devices,
screen-reader sessions, native browser zoom and social-platform unfurls were
not tested. CSS text enlargement to 200% and RTL reflow were tested separately.
One transient status-request DNS/ALPN failure occurred in the long-running
interactive browser session; subsequent polls and the final interaction suite
succeeded. The page retained readings and recovered automatically.

## Existing Telegram bot

The original bot source and dependency files remain available below; running
the bot is separate from serving the static website.

Bot Telegram đa người dùng cho holder [Squeekchain](https://squeekchain.com) (Sepolia testnet).
Ai biết username bot đều có thể `/start` và dùng — không cần mời.

## 8 chức năng

1. **Claimable vượt ngưỡng** — DM khi SQK chưa claim ≥ ngưỡng, báo lại ở mỗi bội số
2. **Claim optimizer** — `/claim`: batch tối đa 32 token, tổng nhận, dust, số tx cần
3. **Cooldown + /mergecheck** — báo khi `cooldown → ready`, liệt kê token merge được
4. **Merge ladder** — `/ladder`: kế hoạch merge theo level, cooldown block, power gain
5. **Hamster chạy/dừng** — alert khi `SPINNING ↔ IDLE`, có RPM
6. **Block hoàn thành** — height + SQK phát ra (chênh lệch supply)
7. **Biến động ví** — activity mới (transfer/stake/merge…), trừ `rewards_claimed`
8. **Watchlist + quiet hours + digest** — 5 ví/người, im lặng ban đêm, digest hằng ngày

Kèm: **mặc định tiếng Anh**, đổi sang tiếng Việt bằng `/lang vi`; `/privacy`, `/delete`; admin `/stats`, `/ban`, `/unban`.

## Lệnh

| Lệnh | Việc |
|---|---|
| `/start` | đăng ký + hướng dẫn |
| `/watch 0x… [tên]` | thêm ví |
| `/unwatch 0x… \| tên` | bỏ ví |
| `/list` | danh sách ví |
| `/status` | trạng thái bánh xe + block |
| `/claim [0x…]` | SQK claim được + số batch (32 NFT/batch) |
| `/mergecheck [0x…]` | Squeek đã hết cooldown |
| `/threshold 0.5` | ngưỡng báo claim |
| `/alerts on\|off` | bật/tắt alert |
| `/quiet 22:00-07:00` | im lặng theo giờ máy |
| `/lang vi\|en` | đổi ngôn ngữ |
| `/privacy`, `/delete` | dữ liệu |

## Chạy

```bash
npm ci
cp .env.example .env && chmod 600 .env   # điền TELEGRAM_BOT_TOKEN
npm start
```

Không có token → chạy `DRY_RUN` (vẫn poll dữ liệu, không gửi tin):

```bash
npm run dry
```

## Test

```bash
npm test
```

37 test: rule claim/cooldown/hamster, claim optimizer, merge ladder, format tin nhắn (HTML escape, locale số en/vi), rate-limit queue, quiet hours, DB (giới hạn ví, dedupe, activity, meta, wipe).

## Kiến trúc

```
src/api.ts     client API Squeekchain (ETag, backoff 429/5xx, timeout)
src/format.ts  toàn bộ nội dung hiển thị (HTML, locale en/vi) — pure, có test
src/rules.ts   pure: evaluateAccount / evaluateHamster / optimizeClaim / planLadder
src/db.ts      node:sqlite (users, wallets, sent) — không cần dependency native
src/queue.ts   1 tin/giây mỗi chat + quiet hours
src/bot.ts     grammY handlers + i18n vi/en
src/chain.ts   claimable() per token qua multicall (fail-soft về API)
src/index.ts   poll: status 15s, ví 45s, digest 60s, healthcheck 5 phút
```

Dữ liệu lấy từ API công khai `api.squeekchain.com/v1` (`/status`, `/accounts/{address}`).
Không đọc private key, không ký giao dịch — mọi hành động đều là link mở app chính thức.

## Giới hạn đã biết

- Số claimable lấy từ API indexer (trễ vài block); `claimable()` on-chain hiện revert trên deployment Sepolia này nên optimizer ghi rõ "ước lượng" khi không đọc được từng token
- Chưa hỗ trợ Discord
- Alert thường bị bỏ (không xếp hàng) trong quiet hours; digest thì vẫn gửi

## License

MIT — see [LICENSE](LICENSE).
