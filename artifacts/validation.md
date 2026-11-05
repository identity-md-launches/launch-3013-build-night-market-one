# Night Market validation and design review

| Area | Final result |
| --- | --- |
| Grouped brief and acceptance requirements | 26 met, 0 missing, 0 faked |
| Known broken primary features | 0 |
| Product and main action on first screen at 390px | Yes, all three stall buttons |
| Production build / typecheck | Passed / passed |
| Model and production interaction checks | 28/28 passed |
| Pinned taste@1 checks | 16/16 passed |
| Automated WCAG A/AA scan | 0 violations in the scanned default state |
| Unresolved copy findings | 0 |
| Share metadata and image | Present; local 1200 × 630 PNG |

## Scope, assumptions and evidence

Reviewed the single public game, including guest play, all stalls, live readings, offline/error behavior, Practice, optional wallet signing, local persistence and motion preferences. Production is the static `dist/` directory. Source is React/TypeScript with Vite's base set to `./`. Browser checks served the export at a `/preview/` subpath.

Visual idea: **a quiet row of striped night-market awnings, where a real wheel sets the pace of local craft**. This is the working game itself; there is no separate landing page or wallet gate.

Consequential choices: Practice awards the same local points and counts while preserving the last saved live round; fill and the transient activity log reset on reload; hidden tabs do not accumulate offline rewards. The optional signature names this browser's book and does not create an account or synchronize it. The brief explicitly requires `window.ethereum`, which takes precedence over the background wallet-connectors reference. Its exact Practice label also takes precedence over the design probe's general preference against em dashes.

The supplied browser MCP failed to launch with “Socket path too long”. Inspection continued with directly launched Playwright Chromium and a bounded script that owned and closed its preview and browser. Chromium also reached the real public endpoint through the environment's network proxy. No proxy setting is part of the shipped site. Actual captured status was **“Idle · the flame stays low · round 290”**, with HTTP 200, no script errors and no overflow. Active-wheel behavior was exercised with clearly confined test fixtures rather than claimed as an observed live ACTIVE reading.

Final rendered evidence:

- [390px first screen](screenshots/first-screen-390.png), 390 × 844 viewport.
- [390px full page](screenshots/live-390.png).
- [320px full page](screenshots/live-320.png), 320 × 700 viewport.
- [1440px full page](screenshots/live-1440.png), 1440 × 900 viewport.
- [Keyboard focus](screenshots/keyboard-focus.png), controlled ACTIVE fixture.
- `interaction-results.json`, `taste-results.json`, `live-observations.json` and `contrast-results.json` retain actual worker-side outputs.

The live captures were inspected visually, including the first 390px screen and the final 320/1440 layouts. The keyboard screenshot was inspected for the visible focus perimeter. Captures are evidence of those states, not proof of every possible device or input combination.

## Requirement coverage

The counts below group closely related brief clauses; they are not an independent certification.

| # | Quoted requirement or grouped clause | Status and implementation evidence |
| --- | --- | --- |
| 1 | “title ‘Night Market’” and exact tagline | Met: `src/main.tsx:135`; `index.html` title. |
| 2 | “A spinning wheel icon. A live status line.” | Met: `Icon` wheel spokes, status mode/round/rpm text and speed-dependent rotation. |
| 3 | “Buttons ‘Sign in’ and ‘Practice’” / guest still plays | Met: enabled header controls and immediately working guest stalls; missing-wallet interaction tested. |
| 4 | “A sentence that changes with the wheel” | Met: `wheelSentence` covers running, idle, stale/unread, loading and Practice; open-stall name used. |
| 5 | “Three stalls side by side: Wick, Oil, and Glass” | Met: three-column responsive grid, local moving art, meter, count and exact Open labels. |
| 6 | “This round”, open stall, points and exact local-points line | Met: round-book section; permanent points explanation. |
| 7 | “‘What just happened’, newest first, at most 8 lines” | Met: `addEvent` caps newest-first activity at 8 entries; long messages wrap on phones. |
| 8 | “One stall is open at a time. Default is Oil.” | Met: sanitized default; immediate switch, visible outline, Open label and `aria-pressed`. |
| 9 | “Closed stalls keep filling at 0.22 times that rate” | Met: exact multiplier, piece counts and meter resets; closed pieces generate no score or completion log. |
| 10 | “+3 market points … otherwise +1” and floating feedback | Met: exact running/low-flame rewards; floating value and required completion text tested. |
| 11 | “GET … on load and every 8 seconds, cache no-store” | Met: `src/main.tsx:45`, 8-second interval; request options and cadence observed in browser validation. |
| 12 | “freshness … online” / observation lifetime / default 120 | Met: checked every game tick, including expiry between polls and recovery. |
| 13 | Exact ACTIVE rate formula and rpm conversion | Met: `wheelState`; fixtures verify 12.4 rpm and the 40 rpm rate cap. |
| 14 | Anchor round, closure fallback and “Round N started.” | Met: parser precedence and one log per changed live round; browser persistence assertions. |
| 15 | Exact idle line, sentence and 0.025 rate | Met: idle fixtures produce the exact selected-stall sentence and a +1 piece. |
| 16 | “Stale, failed, or missing measurement” | Met: low-flame states, no invented rpm, usable stalls and Practice during loading, 503, malformed JSON and timeout. |
| 17 | “Practice — simulated, not live” / “Back to live” | Met: sine-wave rpm around 18; explicit label, exact return log, unchanged saved round while simulating. |
| 18 | “Sign in uses window.ethereum only” and exact message | Met: only `eth_requestAccounts` then hex-encoded `personal_sign`; success fixture checks exact bytes and no other methods. |
| 19 | Missing wallet / wallet closed / short saved address | Met: exact guest log; pending and rejected-signature fixtures preserve play; short display includes full accessible address. |
| 20 | “Persist points, made counts, open stall, round, and address” | Met: exact storage key and fields; fills/signatures excluded; reload and unavailable-storage scenarios tested. |
| 21 | “N lamps”, “N flasks”, “N panes” | Met: mapped units in all three live counts. |
| 22 | Required motion / “prefers-reduced-motion” | Met: wheel, flicker, oil rise/slosh, sequential glass glow, crowd marks; reduced and manual pause stop decorative motion, including the JavaScript-driven oil level. |
| 23 | “No horizontal scroll at 320, 390, or 1440. Big tap targets.” | Met: default widths plus 576/768, 200% text and long values; all default phone controls meet 44px. |
| 24 | Night teal palette / pale candle / only flame is fire | Met: exact requested primary tokens, warm radial flame only; source and final captures inspected. |
| 25 | Static/IPFS-friendly export, source/lockfile, metadata, docs, budget | Met: `dist/`, source, `yarn.lock`, relative assets, favicon/share image, exact README badge sentence and blank canonical-job line, `DESIGN.md`, checks and budget script. |
| 26 | No NFT gate, transfers, copied game or approval claims | Met: no NFT/contract/RPC/transaction flow, no other game's code/art reused, no page claim of a badge, approval or whitelist spot. |

The supplied payer address is informational; the game has no payment flow or recipient configuration. Publication and the canonical IMD URL happen outside this build; the requested README line is intentionally left blank.

## Better Interface: six-domain coverage

The pinned workflow and the core principles of all six domains were read before implementation. Motion/zoom, live-region and contrast support sections were consulted as needed; the documentation section was used after corrections. License notices and attribution are retained separately.

| Domain | Coverage | Evidence and limits |
| --- | --- | --- |
| Accessibility | Checked | Native buttons, landmarks/headings, visible focus, skip path, named meters, pressed state, polite status/activity, storage error, 44px targets, reduced motion, manual pause, automated WCAG scan. Keyboard skip→stall→Space path and computed/visible focus checked. No screen-reader session, physical assistive input or full manual keyboard audit. |
| Layout | Checked | Rendered at 320, 390, 576, 768 and 1440; first phone screen inspected; no overflow; 200% root text reflow, large saved values and an RTL mirror checked. Native browser 200% zoom and exhaustive translations were not performed. |
| Writing | Checked | All action labels against handlers; requested live/idle/Practice/wallet copy; retry language; truthful local points; no invented activity or rewards. Exact required copy retained even where it overrides general style advice. |
| Typography | Checked | Loaded local fonts, descending hierarchy, six-size maximum, three weights, tabular values, wrapping and large values. Both families and all four faces reported loaded. Fallback rendering with fonts deliberately blocked was not checked. |
| Colors | Checked | Requested hex palette; measured rendered solid color pairs below; no text contrast findings in the probe or scanned default state; stronger control border corrected. Pixel-by-pixel contrast over decorative gradients/artwork, APCA and every possible hover/disabled combination were not exhaustively measured. |
| UI | Checked | Rest, hover rules, pressed, focus, signing pending/success/failure, live loading/error/recovery, empty new book, motion preference and pause/resume. Source confirms named 150ms transitions and no `transition: all`; 16 loops normally, 0 under reduced motion. A 10%-speed Animations-panel replay was not performed. |

Themes and localization are not applicable: the brief calls for one dark English game. Forms, dialogs, route transitions and transactional states are not present and were not added to satisfy a generic checklist.

## Findings, corrections and rechecks

All listed findings are resolved. Source references point to the final implementation, not minified bundles.

1. **Medium · layout: Open glass wrapped at 320px.** `src/style.css:235`, `.stall-work { padding: 8px 7px 12px; }`, and `:237`, the shared phone button. Before: the glass button occupied 58px while its peers occupied 44px, leaving an uneven market row. Change: reduce phone inter-stall gap to 8px and inner padding to 7px, preserve the 44px target, and stretch stall structures consistently. Why: readable controls with three side-by-side stalls at 320px. Recheck: final 320px screenshot shows all labels on one line; responsive interaction test and taste layout passed.

2. **Medium · layout/accessibility: enlarged header text overflowed.** `src/style.css:86`, `flex-wrap: wrap`, and `:90`, bounded wrapping utility group. Before: 200% root text produced a 395px scroll width in a 390px viewport, and Sign in became a narrow vertical stack. Change: allow header/utility wrapping and prevent the utility group from shrinking into illegible text. Why: text enlargement must preserve access. Recheck: 200% text at both 320 and 390, all three stall actions and no horizontal overflow passed.

3. **Medium · colors/accessibility: secondary control boundary was too subtle.** `src/style.css:25`, `--color-control-border: #527b76`, consumed at `:91`. Before: `#254744` against `#142426` measured 1.58:1. Change: use a separate stronger control-boundary token while keeping quieter structural lines. Why: a visible control boundary needs 3:1. Recheck: rendered pair now measures **3.40:1**; text remains **14.21:1**.

4. **Medium · accessibility: the connected-wallet name omitted its visible shortened address.** `src/main.tsx:129`, the sign-in `aria-label`. Before: the accessible name contained the full address but not the exact shortened visible label. Change: include the shortened label followed by the full address, and use the visible pending text while waiting. Why: voice and assistive users need the visible label in the accessible name. Recheck: wallet success asserts the shortened label appears in the accessible name; exact signing and saved-address checks passed. Actual speech input remains untested.

5. **Medium · accessibility/UI: CSS-only pause left the oil level moving.** `src/style.css:164` and `:166`, static oil transform for manual pause and reduced motion. Before: keyframes stopped, but the picture's fill-driven inline transform could still change. Change: hold decorative oil at a static midpoint in either stopped-motion mode; keep the functional meter and game working. Why: the brief asks these picture animations to stop for reduced motion. Recheck: the browser compared the computed oil transform before/after 1.5 seconds in both modes; it stayed fixed. Resume and the zero-running-animation check passed.

The initial production build also exposed an unavailable Newsreader CSS entry path. This was repaired by explicit local WOFF2 face imports in `src/style.css:1`; the final build, local asset checks and actual font-loading observations passed. An initial reload test assumed zero fill after a completed navigation; its assertion was corrected to allow a few newly running frames while explicitly checking that no old fill was saved or restored. No product behavior was changed to satisfy that test.

## Measured color pairs

These ratios were calculated from Chromium's computed foreground and actual solid background values for the identified elements, using WCAG relative luminance. They do not claim that every decorative gradient pixel or every possible state was measured.

| Pair | Foreground | Background | Ratio |
| --- | --- | --- | --- |
| Stall text | `#e7f4f2` | `#101c1e` | 15.43:1 |
| Muted stall count | `#8eaaa8` | `#101c1e` | 7.01:1 |
| Primary button text | `#04221c` | `#2fe3c8` | 10.35:1 |
| Secondary button text | `#e7f4f2` | `#142426` | 14.21:1 |
| Secondary control boundary | `#527b76` | `#142426` | 3.40:1 |
| Closed meter fill / track | `#1aa898` | `#193335` | 4.53:1 |
| Focus outline / adjacent stall surface | `#e7f4f2` | `#101c1e` | 15.43:1 |

The taste probe's inferred solid backgrounds do not independently sample the top atmospheric pseudo-element. The bright text has ample measured contrast on the adjacent solid surfaces, but this report does not turn that into an unperformed pixel-contrast claim.

## Commands and outcomes

Commands were run from the repository root. This restricted environment used a workspace scratch browser-cache path via `PLAYWRIGHT_BROWSERS_PATH`; that is validation infrastructure and is not shipped. Standard developer commands are in the README.

| Command | Actual result |
| --- | --- |
| `corepack yarn install --immutable` | Exit 0; locked install. Yarn noted that its PnP ESM loader is experimental. |
| `corepack yarn typecheck` | Exit 0 after final source changes. |
| `corepack yarn build` | Exit 0 after final source changes; static output written to `dist/`. Vite warns that PnP-specific bugs are not actively supported upstream. |
| `corepack yarn validate` | Exit 0; 28/28 model and Chromium production-interaction checks. Virtual time exercises long crafting intervals without real waits. |
| `corepack yarn node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste` | Exit 0; 16/16 checks passed on the final export. The pinned script was used unchanged. |
| Local live-capture script | Exit 0; public API HTTP 200, idle round 290, 320/390/1440 captures, all local fonts loaded, no script errors or overflow. |
| Local rendered-color script | Exit 0; computed pairs retained in `contrast-results.json`. |
| `corepack yarn node scripts/check-bundle.mjs` | Budget and packaging check; result recorded in `bundle-results.json`. |

The taste run's default context could not reach the API directly and exercised the honest unread fallback; its render check reported no script errors or missing local assets. A separate browser run using the environment's proxy established actual live access. Deterministic interaction fixtures validate active, idle, stale, unread, loading, malformed, HTTP-error, timeout, recovery, practice and wallet cases without depending on the public service's current state. The real idle capture is identified separately, not presented as one of those fixtures.

## Submission path budget

The new `.gitignore` has an explicit **0 submitted byte budget** for each generated category below. Required source, `dist/`, local runtime assets, manifests, lockfile and delivery documentation are not ignored.

Explicit delivery allowances are 2 MiB for `artifacts/`, 2 MiB for `dist/`, and 2 MiB for the remaining source/public/docs, with a hard combined ceiling of 8 MiB. The evidence directory is explicitly unignored to override a surrounding workspace exclusion. The final deliverable totals about 1.58 MiB, including the complete export and all retained evidence.

| Ignored paths | Budget | Reason |
| --- | --- | --- |
| `**/node_modules/`, `**/.yarn/`, `/.pnp.*`, `**/.npm/` | 0 bytes | Regenerable dependency installations, PnP maps and caches; no vendored registry or archives. |
| `**/.vite/`, `**/.vite-temp/`, `**/*.tsbuildinfo` | 0 bytes | Regenerable bundler/compiler caches. |
| `/test/scratch/` | 0 bytes | Disposable tests, browser installations and intermediate evidence; final evidence copied to `artifacts/`. |
| `/.cache/` | 0 bytes | Runtime-generated scratch/cache content. |

The packaging checker excludes supplied inputs and protected Git/config paths without reading their contents, rejects unexpected submission symlinks/archives, confirms `dist/index.html`, the local PNG share image, relative asset references and the lockfile, and totals all remaining deliverable files against **8,388,608 bytes**. No dependency archive, registry mirror or submodule is part of the deliverable.

## Limitations and completion

WebKit was installed into disposable scratch space, but launch failed because the runtime lacks system libraries including GTK4, GStreamer and related dependencies. Safari/WebKit behavior is **not verified**. The browser MCP failure and WebKit limitation are environment failures; neither requires a requester account or missing project input. Chromium validation was completed with the fallback described above.

Physical devices, real wallet extensions, actual signatures, screen readers, native browser zoom, browser-storage eviction, cross-browser behavior and social-platform unfurl services were not tested. Only the required static metadata and actual local image were checked; the final hosted origin and canonical URL are assigned later. No claim of complete WCAG conformance, independent certification, badge award, approval or reward is made.

**Complete for the stated scope.** Required build, typecheck, usable interactions, static export, responsive Chromium inspection, six-domain review, fixes and documentation are present. These are the worker's own recorded checks; the path/byte verifier does not independently certify behavior.
