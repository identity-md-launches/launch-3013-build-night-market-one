# Night Market

Pick a stall. The real wheel decides how fast it works.

A small public browser game for the Squeekchain community. Open Wick, Oil or Glass and watch the stalls craft. Oil starts open. Anyone can play as a guest; no Squeek, gas, contract call or token transfer is needed.

Night Market is a community project for the Squeekchain Buildooooor badge.

Canonical IMD job URL: ______________________________

## Open the finished static site

The complete production export is included in `dist/`. Serve that folder with any static HTTP server, for example:

```sh
python3 -m http.server 4173 --directory dist
```

Open **http://localhost:4173** in a browser. Use an HTTP server rather than double-clicking `index.html`, because browser module security can block scripts opened through `file://`.

The export uses relative asset URLs and a single page. It works under a gateway subpath, on IPFS, or on an ordinary static host without route rewrites. Fonts, icons, illustrations, the favicon and the PNG share image are bundled locally. There are no external images, generated-art services, account servers or runtime package downloads.

## Install, develop, preview and rebuild

Use Node.js 24 and Corepack. `package.json` pins Yarn 4.9.4; `yarn.lock` pins the dependencies. Yarn uses Plug'n'Play, with generated dependency files excluded from the submission.

```sh
corepack yarn install --immutable
corepack yarn dev
```

For a production build and preview:

```sh
corepack yarn typecheck
corepack yarn build
corepack yarn preview
```

Vite prints the local development or preview URL. `build` replaces `dist/`; the Vite base is `./`. The checked-in export is the publishable deliverable, so hosting does not need to install or rebuild anything. Keep `dist/` with the source and lockfile when making changes.

The hand-drawn share artwork is `src/assets/share.svg`. Its rasterized result is already included as `public/share.png`. Optional regeneration, after installing Playwright's Chromium, is `corepack yarn node scripts/share-image.mjs` followed by `corepack yarn build`.

## The wheel and the rules

The page reads **[https://api.squeekchain.com/v1/status](https://api.squeekchain.com/v1/status)** on load and every 8 seconds with `cache: 'no-store'`. A request has a 6.5-second timeout and retries on the regular poll; returning to the tab also requests a fresh reading.

It reads `measurement.coreStatus`, `rpmMilli`, `freshness`, `observedAt` and `staleAfterSeconds`. A reading is fresh only when `freshness` is `online` and its observation falls within its lifetime, defaulting to 120 seconds. Freshness is checked between polls, too. The round comes from `builder.anchor.settledThroughRound`, falling back to `oracle.latestClosure.lastRound` when the anchor round is absent.

- Fresh `ACTIVE`: rpm is `rpmMilli / 1000`; the open stall fills at `0.09 + min(rpm, 40) / 180` pieces per second. A completed open-stall piece gives **3 market points**.
- Idle, stale, missing or failed: the open stall fills at **0.025** pieces per second. A completed open-stall piece gives **1 market point**. Unavailable speeds are never invented, and stock never spoils.
- Closed stalls fill at **0.22 times** the open rate. They keep their made counts but award no points and add no completion log entry.
- Switching stalls takes effect immediately and keeps the unfinished work in this visit. The activity book shows the newest 8 events.
- **Practice** uses a sine wave of `18 + 7 × sin(elapsedSeconds / 9)` rpm. Its label is always “Practice — simulated, not live”. Practice shares local points and made counts, but never replaces the saved live round. **Back to live** resumes real readings.

The market advances while the page is visible. Hidden tabs do not collect an offline reward; delayed frames are bounded to avoid catch-up bursts. Pausing decorative motion does not pause crafting. System reduced-motion preferences stop decorative animations automatically.

## Local points and optional sign-in

Points are local to this browser and **are not SQK**. There is no shared leaderboard, reward claim or token balance. `night-market.v1` in localStorage contains points, made counts, open stall, last live round and an optional address. In-progress fill, signatures, Practice mode and the activity log are not persisted. If storage is unavailable, the market still works and explains that the visit cannot be saved.

**Sign in** is optional and uses `window.ethereum` only. It requests `eth_requestAccounts`, then `personal_sign` of the UTF-8 hex encoding of exactly:

```text
Night Market
{address}
This signature only names the stall book. It does not spend tokens.
```

Only the successful address is saved, displayed as `0x1234…abcd` with the full address available in its accessible label and title. The signature is discarded. Sign-in does not synchronize the book, verify NFT ownership, switch networks or send a transaction. Missing wallets and rejected requests are logged while the game keeps running.

## Validation

Run the reproducible model and production-browser checks with:

```sh
corepack yarn playwright install chromium-headless-shell
corepack yarn typecheck
corepack yarn build
corepack yarn validate
```

The validation script owns and closes its temporary static server and browser. It tests the production export under `/preview/`. Browser fixtures are explicitly confined to validation; the shipped game always starts with the real status endpoint.

Actual results for this delivery: production build and typecheck passed; **28/28 interaction/model checks passed**; **16/16 pinned taste checks passed**; the automated WCAG A/AA scan reported **0 violations**. Layout and interactions were checked at 320, 390, 576, 768 and 1440 CSS pixels. The live endpoint also returned HTTP 200 in Chromium and showed a fresh idle reading for round 290 during the recorded capture.

See [the validation record](artifacts/validation.md) for coverage, fixes, measured colors, actual commands and limitations, and [DESIGN.md](DESIGN.md) for the final design system. Evidence includes [the first screen at 390px](artifacts/screenshots/first-screen-390.png) and full-page captures. WebKit could not launch because this runtime lacks its required system libraries. Physical devices, native browser zoom, actual wallet extensions and screen-reader sessions were not tested. Wallet success/rejection were tested with an in-browser provider fixture, and 200% text enlargement was checked separately from native zoom. Vite emits an upstream Yarn PnP support warning; the production build succeeds.

## Source map and notices

- `src/model.ts`: wheel interpretation, rate/scoring rules, event book, safe persistence and exact signature text.
- `src/main.tsx`: browser lifecycle, polling, Practice, sign-in and the game screen.
- `src/Art.tsx`, `src/style.css`: local vector/CSS artwork, components, responsive layout and motion.
- `scripts/validate.mjs`: rule and production-browser validation.
- `scripts/preview-server.mjs`: local validation utility, not a production backend.
- `public/`: favicon, share PNG and font license notices copied into the export.

Font licenses are included in `public/licenses/` and `dist/licenses/`. Design-guide attribution and retained notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
