# Scene Gallery

## Overview

A three.js scene shows each site as a floating card in an orbiting arrangement that visitors fly through, select and launch.

## User Stories

- As a visitor, I want to see all sites as 3D cards so that browsing feels impressive.
- As a visitor, I want to filter by category so that I can find a site quickly.
- As a visitor, I want to click a card and read about it before I leave so that I know what I'm opening.

## Requirements

- [ ] Vanilla three.js, no React. One `SceneEngine` class owns renderer, camera, loop, resize and disposal
- [ ] Layout strategy interface (`ring`, `helix`, `sphere`); MVP default is a ring or helix of cards, categories as vertical bands or arcs
- [ ] Card = rounded plane with thumbnail texture, name label and category accent. Textures loaded lazily and shared via a cache
- [ ] Idle slow auto-rotation; drag or swipe to rotate; scroll, pinch or wheel moves along the axis; inertia damping
- [ ] Hover (desktop) tilts and glows the card and shows a tooltip; focus ring for keyboard
- [ ] Click or Enter selects a card, camera eases to it, and a DOM detail panel opens with: name, description, category, tags, language, last updated, thumbnail, Launch button (opens URL in a new tab with `rel="noopener"`), and a link to the repo if the repo is public
- [ ] Escape or Back returns the camera to the overview
- [ ] Category filter chips dim non-matching cards (animated) and update the accessible list
- [ ] Search box filters by name, tag and description
- [ ] Raycasting uses an instanced or batched approach to stay at 60fps with 60 cards
- [ ] Deep link: `#/site/<id>` selects that card on load
- [ ] Theme changes re-skin live without a reload (see theme-engine.md)
- [ ] Dead-status sites render visibly dimmed with a "may be offline" note

## Acceptance Criteria

- [ ] Loads and renders the ring with the real manifest in < 3s on a mid laptop over fast 3G-simulated assets
- [ ] Clicking each card opens the correct URL (e2e test over the whole manifest)
- [ ] No console errors, and all geometries, materials and textures disposed on teardown (unit-tested via a mock renderer)
- [ ] Playwright screenshot baseline for the overview and one detail view in the Professional theme

## Out of Scope

- Walkable first-person worlds (post-MVP)
- Live iframe previews
- Multiplayer or analytics
