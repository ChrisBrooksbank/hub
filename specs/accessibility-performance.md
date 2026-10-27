# Accessibility and Performance

## Overview

The hub works for keyboard, screen-reader, reduced-motion, touch and low-power visitors, not only for mouse users with a good GPU.

## User Stories

- As a screen-reader user, I want a plain list of all sites so that I can browse without the 3D scene.
- As a visitor sensitive to motion, I want motion reduced so that the page is comfortable.
- As a phone visitor, I want touch controls so that the scene is usable.

## Requirements

- [ ] The list view is the same component used by the Basic theme (see theme-engine.md), so a "List view" toggle simply switches to the Basic theme and back. It swaps the canvas for a semantic, accessible list or grid of the same filtered sites (headings, links, descriptions). It is the default when WebGL is unavailable
- [ ] The canvas has an accessible name and description, and the full site list is always present in the DOM (visually hidden when the scene is shown) with working links
- [ ] Full keyboard navigation: Tab reaches the filter chips, search, theme switcher and the cards; arrow keys move selection around the ring; Enter selects; Escape closes the panel; focus is trapped inside the open detail panel and restored on close
- [ ] `prefers-reduced-motion`: stop auto-rotation, replace camera easing with instant cuts or short fades, disable shake, flashing and parallax; Zen-style slow drift is also off
- [ ] No content flashes more than 3 times per second in any theme (Arcade scanlines must not flicker)
- [ ] Touch: drag to rotate, pinch to zoom, tap to select, with hit targets of at least 44px equivalent
- [ ] Adaptive quality: detect low-power devices (mobile, low `hardwareConcurrency`, slow first frames) and reduce pixel ratio, disable postFx and cut particle counts
- [ ] Live region announces filter results ("12 sites shown")
- [ ] Colour is never the only carrier of meaning (the dead-site state has text, not just dimming)
- [ ] Lighthouse accessibility score >= 95, with axe checks run in Playwright on the list view and the detail panel
- [ ] Performance budget: initial JS <= 500 KB gzip (three.js tree-shaken, postFx code-split), 60fps on the Professional theme with the full manifest on a mid laptop

## Acceptance Criteria

- [ ] axe-core reports zero serious or critical violations in every theme (e2e)
- [ ] A keyboard-only e2e test can select a site and reach its Launch link
- [ ] With `prefers-reduced-motion: reduce` emulated, the rotation angle does not change over 3 seconds (e2e)
- [ ] With WebGL disabled, the list view renders and all links work

## Out of Scope

- Screen-reader narration of the 3D space itself (the list view is the accessible equivalent)
- Internationalisation
