# Thumbnails

## Overview

A Playwright script captures a screenshot of every live site and commits optimised images the hub loads statically.

## User Stories

- As a visitor, I want each card to show what the site looks like so that I can choose by sight.
- As the owner, I want to be able to give any site generated art instead of a real screenshot, via `thumbMode`.

## Requirements

- [ ] `npm run sites:shots` visits each non-hidden, non-dead manifest URL with Playwright (1280x800 viewport, wait for network idle plus a short settle delay) and writes `public/thumbs/<id>.webp` (about 640x400, quality ~80) via `sharp`
- [ ] Supports `--only <id>` and `--force`, and by default skips sites whose thumbnail is newer than the site's `lastPushed`
- [ ] Per-site override in `sites.overrides.json`: `thumbMode: "screenshot" | "generated"`; `generated` skips capture
- [ ] Procedural fallback art: deterministic canvas/shader generated from the site id (colour from `accent` or a hash), used when there is no screenshot, the capture failed, or `thumbMode` is `generated`
- [ ] Screenshot failures are reported, never fatal, and the site falls back to generated art
- [ ] Sites that require login or show cookie or permission dialogs may set `shotWaitFor` or `shotClick` selectors in overrides
- [ ] Image size budget: total `public/thumbs` under about 5 MB

## Acceptance Criteria

- [ ] Running the script against 3 sample live sites produces 3 valid webp files of the expected dimensions
- [ ] A site flagged `thumbMode: "generated"` produces no network visit to that URL (tested with a mocked browser)
- [ ] Generated art is deterministic (same id gives same pixels) and unit tested
- [ ] Cards in the scene fall back gracefully when a thumbnail 404s

## Out of Scope

- Video or animated previews
- Scheduled screenshot refresh in CI (post-MVP)
