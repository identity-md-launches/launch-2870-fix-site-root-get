# Squeek Holder Bot

[![test](https://github.com/DinhTienhz/squeek-holder-bot/actions/workflows/test.yml/badge.svg)](https://github.com/DinhTienhz/squeek-holder-bot/actions/workflows/test.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A524-brightgreen.svg)](package.json)

## Static website: root fix

The website now exports **`dist/index.html` at the top level**, with the exact title
`Squeek Holder Bot — Telegram alerts for Squeekchain`. It carries forward the live
panel from master commit [`ed8af27`](https://github.com/DinhTienhz/squeek-holder-bot/commit/ed8af27b4342500e53e364bf9e3ae724fe791974).
GitHub's master API and that commit's raw page were checked on 2026-11-02; the
commit changes only `public/index.html` relative to the supplied checkout.

### Install, rebuild and preview

Use Node 24 or newer. **The static website needs no package installation.** Its
CSS, JavaScript, logo and favicon are inline. The local share image is included in
`public/assets/` and `dist/assets/`. The existing `package.json` and lockfile are
preserved for the Telegram backend.

```bash
node scripts/build-site.mjs
node scripts/preview-site.mjs 0
```

The preview prints its URL; open `/` or `/preview/`. Port `0` asks for an available
port. Stop the preview with Ctrl+C. For a fixed port, pass `4173` instead.
Edit `public/index.html`, then rebuild. The build copies the exact HTML and assets
into `dist/`, checks the required entry markers and relative URLs, and generates
the file CID, CAR archive and optional gateway worker. Serve the contents of
`dist/` as the document root; never serve the repository or a parent folder.
The committed export is ready for a static publisher and uses relative local
asset URLs and hash navigation. No frontend dependency or lockfile change is
needed.

### File CID and gateway root

The current computed UnixFS **file CID** is:

```text
bafybeiehglfgjfperkd5fbg3345btyj6lg7o6otnpqers4iyhfcd6yi6le
```

`deploy/site-root.json` and the matching downloadable
`artifacts/site-root.json` record its digest, import settings and publication
status. `artifacts/site-root.car` contains both the HTML file root and share-image
file root. Their CIDs were compared with the standard UnixFS importer and the CAR
was independently decoded. Rebuilding refreshes all generated values.

Publication is still pending: no Pinata credential or site-name publishing
capability was supplied. `hosting.publishedFileCid` remains `null` and
`rootMappingVerified` remains `false`. Nothing was fabricated. The existing named
site returned `curl: (35) ... tlsv1 alert internal error` on three attempts at
2026-11-02 08:54 UTC (HTTP `000`), so its public root behavior could not be verified.

Publisher handoff:

1. Publish the committed `dist/` as the next site version with its `index.html`
   directly at the document root. This is the assignment's normal static export.
2. For the requested single-file root, pin/import the two file roots in
   `artifacts/site-root.car` using a CAR-capable IPFS importer and pin both roots.
   Alternatively upload `public/index.html` as one file in Pinata with directory
   wrapping disabled; retain the service's returned file CID. Import settings can
   change a CID, so compare the returned CID with the manifest before routing.
   Pin the share image too. [Pinata documents single-file uploads](https://pinata.cloud/blog/how-to-use-pinata-a-step-by-step-guide-for-beginners/)
   and [its directory-wrapping option](https://github.com/PinataCloud/Pinata-SDK#pinata-options).
3. Bind the site name/root route to the HTML file CID. If an existing gateway
   route continues to list a directory, use `artifacts/site-root-worker.mjs`, a
   standalone module worker generated from `deploy/site-root-worker.mjs`. It
   proxies `/` and `/index.html` to the exact HTML CID with HTTP 200 and an HTML
   content type, serves `/assets/share.png` from its file CID, and redirects the
   legacy `/public/index.html` route to `/` with HTTP 308. A deployment that uses
   different returned file CIDs must update the worker's `site` values accordingly.
   This worker requires binding by the account that controls the site; it was
   locally checked with simulated upstream responses and has not been deployed.
4. Fetch the public `/` after publishing, check HTTP 200 and the exact title,
   open the page and check `live-state`, `live-block`, `live-mint`, and confirm
   `/assets/share.png` loads. Set publication status only after those checks pass.
   IPFS gateways do not execute a redirect file inside a directory listing;
   the root mapping belongs at the gateway/name or its edge route.

All page runtime code and the favicon work from a single HTML file. The relative
share-image metadata needs the documented `/assets/share.png` mapping (provided
by the worker) or directory export. A bare file-CID gateway link by itself cannot
supply sibling assets. Social-platform unfurling has not been tested.

### Live data and behavior

The page reads `https://api.squeekchain.com/v1/status` and
`https://api.squeekchain.com/v1/economy/state` immediately and every **10 seconds**.
Requests time out after 8 seconds and overlapping refreshes are prevented. The
panel distinguishes loading, sensor delay, unavailable data and retained stale
values; Refresh now offers immediate recovery. A resting wheel displays `0 rpm`.
Amounts are parsed as integer base units before display formatting. Malformed
fields fail visibly, without invented block, RPM or supply values. The site has
no wallet connector or signing flow.

### Validation

Actual worker results on 2026-11-02:

| Check | Result |
| --- | --- |
| `node scripts/build-site.mjs` | Passed; byte-identical source/export, assets and file-CID artifacts generated |
| Strict site TypeScript check | Passed, via `scripts/typecheck-site.mjs` |
| `scripts/validate-site.mjs` | **14/14 passed** in Chromium |
| Pinned `taste.mjs` | **16/16 passed** at 320, 390 and 1440, plus reduced motion |
| axe WCAG A/AA scan | 0 violations; 0 incomplete checks |
| `npm test` | **37/37 passed** |
| Standard UnixFS importer and CAR reader | Both file CIDs match; 2 valid roots and blocks |

The interaction check covers actual HTTP root/subpath responses, real API reads,
responsive reflow, keyboard navigation and refresh, the Telegram link, accessibility,
reduced motion, RTL and CSS text enlargement. Explicitly simulated API failures
exercise retry, polling cadence, retained data, malformed fields and timeout.
The Telegram navigation test intercepts the destination; it does not send a message.
A separate public Telegram-page fetch returned a contact page with Send Message;
bot availability and message delivery remain unverified.

Optional validation tools can be installed in a fresh directory outside the repo:

```bash
squeek_tools_dir=$(mktemp -d /tmp/squeek-tools.XXXXXX)
squeek_cache_dir=$(mktemp -d /tmp/squeek-cache.XXXXXX)
npm install --prefix "$squeek_tools_dir" --cache "$squeek_cache_dir" --no-audit --no-fund playwright@1 typescript@5 @axe-core/playwright@4
PLAYWRIGHT_BROWSERS_PATH="$squeek_tools_dir/browsers" "$squeek_tools_dir/node_modules/.bin/playwright" install chromium webkit
node scripts/typecheck-site.mjs "$squeek_tools_dir/node_modules/.bin/tsc"
PLAYWRIGHT_BROWSERS_PATH="$squeek_tools_dir/browsers" node scripts/validate-site.mjs "$squeek_tools_dir"
```

The pinned probe was run from the repository root with
`node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste`.
`IMD_PLAYWRIGHT` selected an external Playwright adapter that only adds Chromium's
`channel: 'chromium'`, `--no-sandbox` and `--disable-dev-shm-usage` launch options.
The default headless-shell attempt crashed; the full Chromium launch succeeded.
The probe script and measurement rules were unchanged. Its pinned inputs and raw
scratch output are removed by the assignment; the 16 check results are retained
in `artifacts/design-probe.json`.

See `DESIGN.md` for the implemented design system and
`docs/validation.md` (also `artifacts/validation.md`) for the six-domain review, fixed findings, evidence and
limitations. Screenshots: `artifacts/mobile.png` and `artifacts/desktop.png`.
WebKit could not launch because its required runtime libraries were unavailable;
Safari, screen-reader sessions, physical devices, native browser zoom, social
unfurling and public publication are unverified. No private configuration or
credentials were used, and nothing was fabricated.

---

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
