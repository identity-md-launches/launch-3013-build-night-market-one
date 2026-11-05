# Night Market design system

## Overview

Night Market is a public, English browser game for the Squeekchain community. The visual idea is a quiet row of three striped market awnings, with a real wheel setting the pace of local craft. It uses a night teal palette, a restrained top glow and pale objects. Only the candle flame introduces warm color.

The game stays visible immediately: compact utilities, a serif product title, one plain tagline and wheel status, then the three playable stalls. The implementation is React, TypeScript and plain CSS. The source of truth is `src/style.css`, with artwork in `src/Art.tsx` and screen composition in `src/main.tsx`.

## Colors

Tokens are declared in `src/style.css:6`. The primitive palette uses hex values; semantic tokens describe the major UI roles.

| Token | Value | Implemented role |
| --- | --- | --- |
| `--color-bg` / `--night-950` | `#0c1214` | Page background |
| `--color-surface` / `--night-900` | `#101c1e` | Stall interiors |
| `--color-hover` / `--night-850` | `#142426` | Secondary button fill and hover surfaces |
| `--night-800` | `#193335` | Meter track |
| `--color-text` / `--teal-50` | `#e7f4f2` | Primary text and keyboard focus outline |
| `--color-muted` / `--sage-400` | `#8eaaa8` | Secondary text, times, closed stall labels |
| `--color-border` / `--teal-700` | `#254744` | Structural borders and separators |
| `--color-control-border` | `#527b76` | Visible secondary control boundaries |
| `--accent` / `--teal-400` | `#2fe3c8` | Open-stall outline, primary button, live work and reward cues |
| `--button-text` | `#04221c` | Text on the primary mint fill |
| `--oil` / `--teal-500` | `#1aa898` | Bottle contents and closed-stall meter fills |
| `--glass` / `--teal-100` | `#d5f3ee` | Translucent pane and bottle artwork |
| `--teal-600` | `#42716b` | Decorative crowd silhouettes |

The awnings use `--awning-light: #337b70`, `--awning-dark: #163d38`, and `--awning-edge: #578f82`. The open stall overrides these with `#4d9f8d`, `#1c5247`, and `#78b49f`. Shelf strokes, shadows and bottle caps use the local `--art-line`, `--art-shadow` and `--bottle-cap` tokens.

The pale candle uses `--candle: #d5e1d4`, `--candle-top: #ebf0db`, `--candle-drip: #b5cdbd`, and `--candle-highlight: #f3f7e8`. The flame is a radial gradient through `#fff7c2`, `#ffe14a`, `#ff9a1f`, and `#e23b12`, with an 8px warm drop shadow. Its warmth never spreads to buttons, backgrounds or other stalls.

Measured text pairs meet the pinned WCAG ratio checks; specific pair values and the scope of the measurement are in `artifacts/validation.md`. An “Open” label and pressed state accompany accent color, so selection is not communicated by color alone.

## Typography

Fonts are bundled as WOFF2 through four `@font-face` rules at the top of `src/style.css`:

- `--font-display`: **Newsreader Variable**, Georgia, serif. The bundled normal face supplies weights 200–800; the title and stall names use 400.
- `--font-ui`: **DM Sans**, Arial, sans-serif. Local normal faces at 400, 500 and 600 cover body text, utilities and the primary button. No italic or additional font family is used.

| Token | Desktop | At `max-width: 36rem` | Role |
| --- | --- | --- | --- |
| `--text-caption` | 12px | 12px | Fine labels and phone controls/counts |
| `--text-small` | 14px | 14px | UI copy, counts and tagline on phones |
| `--text-body` | 16px | 16px | Tagline and section headings |
| `--text-heading` | 24px | 24px | Stall names and floating points |
| `--text-score` | 32px | 24px | Market points |
| `--text-title` | 64px | 40px | Product title |

Sizes are defined in rem. Default line-height is 1.5; title 1.1; stall names and score 1.2. Only the display title has tracking, `-0.035em`. Headings use balanced wrapping, prose uses pretty wrapping, and numbers use tabular figures. Counts and points can wrap rather than clip at large values. The connected address keeps its full value in the accessible label and title.

Chromium confirmed all four local font faces loaded. The final probe measured two families, three weights and six total sizes at desktop, five at phone size.

## Layout

`.page-width` is the shared alignment primitive: a maximum width of 1080px and a 64px total viewport inset on larger screens. At `48rem` and below, the total inset becomes 40px; at `36rem` and below, 32px. Header utilities can wrap when enlarged text or an address needs more room.

`.stalls` always uses `repeat(3, minmax(0, 1fr))`, preserving the side-by-side market required by the brief. Its gap is 28px, then 16px at `48rem`, and 8px at `36rem`. Stalls stretch equally; `.stall-work` uses `margin-top: auto` to align counters and actions. Illustrations scale within a 4:3 box, up to 240px wide.

The main spacing steps are 4, 8, 12, 16, 24 and 28px. Desktop stall content is inset 24px; tablet 16px. Phone meter and button sections use a 7px inline inset so “Open glass” fits at 320px without shrinking its 44px target. Phone stall headings become vertical and trailing button icons disappear; the actual labels remain.

The status reserves 42px on desktop and 52px on phones, and the phone wheel sentence reserves 36px, reducing shifts as readings change. Text containers can grow. The round book uses two flexible columns, with the local-points note across both. Logs have a mark, flexible message and time column; messages wrap safely.

Observed widths: 320, 390, 576, 768 and 1440px. All three primary actions are visible on the first 390 × 844 screen. Root text enlarged to 200% reflows at 320 and 390px with working controls. Native browser zoom is not the same check and remains unverified.

## Elevation & Depth

The site uses flat tonal surfaces and structural borders. Stall interiors have no box shadow. Selection adds a mint outline and brighter awning. The top atmospheric glow is a noninteractive radial-gradient pseudo-element, beneath the content via isolation and `z-index: -1`. Only flame light and the sequential glass glow use drop shadows. The skip link is the only elevated control; it appears on keyboard focus.

## Shapes

Stalls have 9px corners, reduced to 7px on phones; their awnings fit with 8px and 6px corners respectively. Buttons have 6px corners. Meters have a 4px radius and clip only their decorative fill. Status dots are circular. The striped, scalloped awnings and translucent drawn objects provide the product identity; generic layered cards are not part of the system.

## Components

| Component or pattern | Source | Variants and behavior |
| --- | --- | --- |
| `Icon` | `src/Art.tsx` | One local 24px SVG system; wheel, wallet, spark, arrow, moon, check, pause and play. `currentColor`, 1.5px strokes, decorative SVGs hidden from assistive technology. |
| `Awning` | `src/Art.tsx` | Unique clip IDs for each stall; colors inherited from the current stall state. |
| `StallArt` | `src/Art.tsx` | `stall` and `fill` props select the candle, oil bottle or sequential glass panels. The oil level follows actual fill. |
| `Crowd` | `src/Art.tsx` | Three small silhouettes under each stall; brighter when open. Decorative. |
| Stall | `src/main.tsx`, `.stall*` | Name, Open/Slow craft cue, picture, named progressbar, count and native toggle button. Exactly one `aria-pressed` button is true. |
| Button | `.button`, `.primary`, `.utility` | Secondary outlined, open-stall mint fill, utility. Minimum 44px; hover gated to hover-capable pointers; visible 2px keyboard outline, 4px offset; disabled only during a wallet request. |
| Wheel status | `.wheel-status` | Loading, running, idle, stale, unread and explicit simulated Practice modes. Polite status announcements. |
| Round book | `.round-book` | Open-stall name, local points, permanent local-only explanation and optional storage-unavailable notice. |
| Activity log | `.event-log` | Newest first, up to 8 entries. Polite additions, no closed-stall completion noise. |
| Motion control | `.motion-button` | Native button toggles `.motion-paused`; score calculation continues. |

Motion is opt-in under `prefers-reduced-motion: no-preference`. Wheel rotation is 32 seconds in low-flame modes and 1.8–12 seconds while running. Wick flickers in 1.8 seconds, or 0.65 seconds when open. Oil sloshes in 2.8 seconds; glass glows over a 3.9-second cycle with 1.3-second offsets. Crowd marks bob over 3.5 seconds. Reward feedback floats for 1.3 seconds and remains represented in the permanent event book. Button feedback is a named 150ms transition with `scale(0.96)` on press. Reduced motion removes these animations; the explicit motion button pauses them without changing game rules. In either state the decorative oil level is held at a static midpoint; the functional progress meter and counts continue to update.

## Do's and Don'ts

- Start with `.page-width`, the six type tokens and existing buttons. Reuse `Icon` and the existing palette for any future page.
- Keep one filled action: the currently open stall. Pair any selection color with text and semantic state.
- Keep the market playable while external data, wallet or storage is unavailable. Label simulations explicitly and preserve local-point wording.
- Keep all three stalls together on phones. Let enlarged text wrap and containers grow.
- Keep new artwork local and in the same restrained vector style. Reserve fire colors for the flame and keep the candle pale.
- Preserve named motion transitions, the reduced-motion guard and the manual motion control. Avoid additional loops or attention-grabbing surfaces.
- Do not introduce token claims, NFT requirements, extra wallet stacks or a dashboard into this game.

Design principles were applied from Jakub Krehel's Better Interface (MIT), pinned commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`. The implementation documentation method is adapted from Paul Bakaus's Impeccable (Apache-2.0), pinned commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`. See `THIRD_PARTY_NOTICES.md` for source links and retained license notices.
