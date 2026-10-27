# Implementation Plan

## Status

- Planning iterations: 2
- Build iterations: 0
- Last updated: 2026-10-27
- Codebase state: greenfield (re-verified iteration 2). Only specs, prompts, loop scripts and AGENTS.md are tracked. No `src/`, no `package.json`. Plan reviewed against specs; no changes needed.

## Tasks

Priority order. Each task = one build iteration. Dependencies come first.

### Phase 1: Foundation (spec: project-foundation.md)

- [x] Initialise Vite + strict TypeScript + vanilla three.js + `zod` project with the module layout `src/engine/ src/themes/ src/data/ src/ui/ scripts/ data/ public/thumbs/`; `main` branch, first commit including the existing untracked files; scripts `dev`, `build` (`tsc -b && vite build`), `preview` (spec: project-foundation.md)
- [x] Add ESLint (flat config), Prettier, Vitest (jsdom), Knip; scripts `lint`, `format`, `format:check`, `typecheck`, `test:run`, `check` (typecheck + lint + format:check + test:run). Mirror `C:\code\life` and `C:\code\earth` configs. Include one trivial passing test (spec: project-foundation.md)
- [x] Add Husky + lint-staged pre-commit hook; verify it blocks a commit with a lint error (spec: project-foundation.md)
- [x] Add Playwright config + one smoke test (page loads, no console errors) and the `test:e2e` script; follow `C:\code\earth\playwright.config.ts` (spec: project-foundation.md)
- [x] Add `netlify.toml` (build command, publish `dist`, security headers, SPA fallback) and `.github/workflows/ci.yml` running `check` + Playwright on push and PR (spec: project-foundation.md)
- [ ] Add README: purpose, commands, how to add or hide a site, manual Netlify setup step (spec: project-foundation.md)

### Phase 2: Manifest data layer (spec: site-manifest.md)

- [ ] Zod schema + `Site` type for the manifest entry (`id name url repo description category tags[] language isPrivateRepo lastPushed thumb? hidden? accent?` plus `status`, `thumbMode`, `shotWaitFor`, `shotClick`); loader that throws a readable error on a malformed manifest; unit tests (spec: site-manifest.md)
- [ ] Pure merge function: deep-merge overrides over generated (override wins, overrides may add repo-less sites); stable key ordering; unit tests for precedence (spec: site-manifest.md)
- [ ] Pure URL extraction (`*.netlify.app`, `*.azurewebsites.net`, `*.pages.dev`, `*.github.io`, `*.vercel.app`) from README/CLAUDE.md/netlify.toml/`.netlify/state.json`, plus category heuristic (Games, Learning, Wellbeing, Local (Chelmsford), Tools, 3D & Visual, Parliament); unit tests (spec: site-manifest.md)
- [ ] `scripts/scan` part 1: `gh repo list` + local `C:\code\*` folder discovery; exclusion list for non-websites; writes `data/sites.generated.json` idempotently (spec: site-manifest.md)
- [ ] `scripts/scan` part 2: Netlify site-id to URL resolution (token from env, never committed), HTTP HEAD/GET verification flagging `status: "dead"`, console report (new sites, dead URLs, repos without URL) (spec: site-manifest.md)
- [ ] Run the scan for real; confirm >= 25 live entries; check that every private-repo site is `hidden: true` and every public-repo site is not (the hiding rule is private-repos-only, with no hand-picked list) (spec: site-manifest.md)
- [ ] Vite plugin that merges generated + overrides at build time and strips `hidden` entries before bundling; add a build test that greps `dist/` for a hidden site's id/url and fails if found (spec: site-manifest.md)

### Phase 3: Accessible list view and Basic theme (build the list once; spec: accessibility-performance.md, theme-engine.md)

- [ ] `Theme` type in `src/themes/types.ts` with every field listed in the spec; theme registry (plain config objects, engine never branches on `theme.id`); unit test that all registered themes satisfy the type (spec: theme-engine.md)
- [ ] App shell and state: filter (category chips, search by name/tag/description) as a pure function with unit tests; live region announcing "N sites shown" (spec: scene-gallery.md, accessibility-performance.md)
- [ ] Semantic list view `src/ui/list`: sites grouped by category, headings, links, descriptions, "may be offline" text for dead sites, optional thumbnails with alt text; filter and search wired in (spec: accessibility-performance.md)
- [ ] Basic theme config (`presentation: "list"`): system fonts, black on white, honours `prefers-color-scheme` and `prefers-contrast`, large text, focus outlines, underlined links, no animation; the entry point must `import()` three.js dynamically so Basic never loads it (spec: theme-engine.md)
- [ ] Theme persistence (`localStorage`, `?theme=` override, default Professional), accessible switcher (labelled radio group), auto-select Basic with no WebGL, suggest Basic on `prefers-reduced-motion` / `prefers-contrast: more`, "List view" toggle (spec: theme-engine.md, accessibility-performance.md)
- [ ] Playwright + axe-core test for the list view (zero serious/critical, 200% zoom) and a bundle test that the initial Basic load ships no three.js; test with WebGL disabled that links work (spec: theme-engine.md, accessibility-performance.md)

### Phase 4: Scene engine (spec: scene-gallery.md)

- [ ] `SceneEngine` class: renderer, camera, render loop, resize, full disposal (geometries/materials/textures); unit test disposal via mock renderer (spec: scene-gallery.md)
- [ ] Layout strategy interface with `ring` implementation (categories as vertical bands/arcs), then `helix` and `sphere`; pure layout math unit-tested (spec: scene-gallery.md)
- [ ] Card meshes: rounded plane, thumbnail texture via lazy shared cache, name label, category accent, dead-site dimming; use instanced/batched approach for raycasting at 60 cards (spec: scene-gallery.md)
- [ ] Controls: idle auto-rotation, drag/swipe, wheel/pinch along the axis, inertia damping (spec: scene-gallery.md)
- [ ] Selection: hover tilt/glow + tooltip, click/Enter select, camera easing to card, Escape/Back returns to overview, deep link `#/site/<id>` (spec: scene-gallery.md)
- [ ] DOM detail panel: name, description, category, tags, language, last updated, thumbnail, Launch (`rel="noopener"`, new tab), repo link if public; focus trap and restore on close (spec: scene-gallery.md, accessibility-performance.md)
- [ ] Filter chips and search dim non-matching cards (animated) and sync the accessible list; hidden-but-present site list in DOM when scene is shown (spec: scene-gallery.md, accessibility-performance.md)
- [ ] Professional theme config + live theme application (colours, fog, lights, fonts, copy) with a ~600ms cross-fade (instant under reduced motion); no `theme.id` branching in the engine (spec: theme-engine.md)
- [ ] Keyboard nav: Tab to chips/search/switcher/cards, arrow keys move selection around the ring; canvas accessible name/description (spec: accessibility-performance.md)
- [ ] Reduced motion: stop auto-rotation, instant cuts or short fades, no shake or parallax; e2e test that rotation angle does not change over 3s (spec: accessibility-performance.md)
- [ ] Touch: 44px hit targets, pinch zoom, tap to select (spec: accessibility-performance.md)
- [ ] Adaptive quality: detect low-power devices (mobile, low `hardwareConcurrency`, slow first frames); lower pixel ratio, drop postFx, cut particles (spec: accessibility-performance.md)

### Phase 5: Thumbnails (spec: thumbnails.md)

- [ ] Deterministic procedural art generator from site id / `accent`, unit-tested for determinism; used as a fallback texture in the scene and list view (spec: thumbnails.md)
- [ ] `scripts/shots`: Playwright capture 1280x800, network idle + settle, sharp to 640x400 webp q~80 into `public/thumbs/<id>.webp`; `--only`, `--force`, skip when newer than `lastPushed`; `thumbMode`, `shotWaitFor`, `shotClick`; failures reported, never fatal; test with mocked browser that `generated` never visits the URL (spec: thumbnails.md)
- [ ] Run shots against the real manifest; check `public/thumbs` is under ~5 MB; cards fall back gracefully on thumbnail 404 (spec: thumbnails.md)

### Phase 6: Remaining themes (spec: theme-engine.md)

- [ ] Optional postFx pipeline (bloom, scanlines, vignette, grain), code-split and disabled on the low-power path; ambient particle FX (spec: theme-engine.md, accessibility-performance.md)
- [ ] Retro Arcade theme (Press Start 2P, grid floor, neon, CRT scanlines with no flicker above 3Hz, "INSERT COIN TO LAUNCH" copy) (spec: theme-engine.md)
- [ ] Calm / Zen theme (pastel gradient, ~4s in / 6s out drift disabled under reduced motion, soft particles, gentle copy) (spec: theme-engine.md)
- [ ] Moose Mode theme: first read `C:\code\moose` (README, docs, index.html) for personality, assets and jokes; reuse what fits (spec: theme-engine.md)
- [ ] Theme tests: every theme passes WCAG AA text-on-card contrast; a dummy fifth theme needs zero engine changes; switching 20 times leaks no GPU resources (spec: theme-engine.md)

### Phase 7: Hardening and acceptance

- [ ] Playwright screenshot baselines: overview in each of the five themes, plus one Professional detail view (spec: theme-engine.md, scene-gallery.md)
- [ ] e2e: click every card in the real manifest opens the correct URL; keyboard-only flow reaches the Launch link; no console errors (spec: scene-gallery.md, accessibility-performance.md)
- [ ] e2e axe sweep in every theme and on the detail panel (zero serious/critical) (spec: accessibility-performance.md)
- [ ] Performance: verify initial JS <= 500 KB gzip, load < 3s on throttled network, Lighthouse accessibility >= 95; fix regressions (spec: accessibility-performance.md)
- [ ] Final CI check from a fresh clone: `npm ci && npm run check && npm run build` (spec: project-foundation.md)

## Backlog (post-MVP, do not build)

- Themes: Neon Noir / Nightclub, Mystic / Tarot, Pub Night, Mini Golf (spec: theme-engine.md)
- Walkable first-person worlds (spec: scene-gallery.md)
- Scheduled GitHub Action re-scan of the manifest (spec: site-manifest.md)
- Scheduled screenshot refresh in CI (spec: thumbnails.md)
- Per-theme music (sound hook exists, defaults off, ships empty)

## Completed

<!-- Completed tasks move here -->

## Notes

- Manual owner steps (not for the loop): create the Netlify site and link the repo; supply a Netlify token via env for the scan.
- Architecture: `Theme` is pure data; `SceneEngine` consumes a theme and a layout strategy and never inspects `theme.id`. `presentation: "list"` routes to the list view, which is the same component for Basic, the List toggle and the no-WebGL fallback.
- three.js must only be reached via dynamic `import()` from the scene path so the Basic theme's initial bundle has none of it.
- Hidden sites are stripped by a Vite build step, not UI filtering. The same step should guarantee that thumbs for hidden sites are not emitted into `dist/`.
- Dependency policy: runtime deps are `three` and `zod` only; `sharp` and Playwright are dev-only; no UI framework.
- Reference configs: `C:\code\life` (package.json scripts, lint-staged) and `C:\code\earth` (Playwright, Netlify, knip, design.md). Note `life` uses Preact, so do not copy that dependency.
- `C:\code\moose` exists; inspect it only when building Moose Mode.
- The seed knowledge in site-manifest.md must be verified by the scan. Do not trust it blindly.
- Windows 11 + Git Bash: scripts should use Node `path` APIs and work with `C:\code` paths.
