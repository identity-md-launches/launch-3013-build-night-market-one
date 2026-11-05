# Third-party notices

## Runtime fonts

DM Sans and Newsreader are distributed under the SIL Open Font License 1.1. Their original notices and full license text are included in `public/licenses/dm-sans-OFL.txt` and `public/licenses/newsreader-OFL.txt`, and copied into `dist/licenses/`. Fontsource packages provide the local WOFF2 assets; the game does not contact a font CDN at runtime.

## Runtime libraries

React and React DOM are MIT-licensed, copyright Meta Platforms, Inc. and affiliates. Their retained license text is included in `public/licenses/react-MIT.txt` and `public/licenses/react-dom-MIT.txt`, and copied into `dist/licenses/`. Build and validation dependencies are pinned by `yarn.lock`; their package archives and dependency directories are excluded from the submission.

## Design guidance

The design and six-domain review use the supplied pinned adaptation of [Jakub Krehel's Better Interface](https://github.com/jakubkrehel/skills/tree/267330e1adfc66a718fb65fa6918c1f06d0a689e/skills/better-interface), commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`, under the MIT license.

The design documentation method uses the supplied adaptation of [Paul Bakaus's Impeccable document reference](https://github.com/pbakaus/impeccable/blob/9d715cc4f5564a990ca8345abfdd5df6dc9b41c8/skill/reference/document.md), commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`, under Apache-2.0. Copyright 2025 Paul Bakaus. The adaptations apply the guidance to this bounded build, consolidate its review evidence, and document the final source rather than propose a redesign.

Both supplied license texts and their attribution notices are retained verbatim in `artifacts/design-guidance-LICENSE.txt`. Each work retains its own license.
