# Theme Engine

## Overview

Themes are plain configuration objects that restyle the same scene engine, switchable at runtime.

## User Stories

- As a visitor, I want to switch themes so that the hub can feel professional or playful.
- As the owner, I want to add a theme by writing one config file so that experimenting is cheap.

## Requirements

- [ ] `Theme` type in `src/themes/types.ts`: `id`, `label`, `presentation` (`"scene"` or `"list"`), `palette`, `fonts`, `background` (colour, gradient or shader), `fog`, `lights`, `cardStyle` (corner radius, border, material, emissive), `layout` (which layout strategy and its parameters), `motion` (idle speed, hover style, transition easing, camera shake), `postFx` (bloom, scanlines, vignette, grain, all optional), `ambientFx` (particles and the like), `copy` (headings, button labels, tooltips, empty states, 404 text), `sound?` (off by default)
- [ ] The engine never branches on `theme.id`, and all differences flow from config
- [ ] Theme switch persists in `localStorage` and respects `?theme=` query param; default is Professional
- [ ] Switcher UI is accessible (labelled radio group or menu)
- [ ] Theme transition cross-fades colours and lights over ~600ms (instant under reduced motion)
- [ ] Post-processing is optional and disabled on the low-power fallback

## MVP Themes (build these five)

0. **Basic** (most accessible): no 3D at all. Plain semantic HTML list of sites grouped by category, system fonts, high-contrast black on white (honours `prefers-color-scheme` and `prefers-contrast`), large text, visible focus outlines, underlined links, no animation, no images required (thumbnails optional, with alt text). Uses `presentation: "list"` in its config, which tells the engine to mount the accessible list view instead of the canvas and never load three.js (dynamic import). It is the same list view specified in accessibility-performance.md, so build that view once. Filter and search remain. Auto-selected when WebGL is unavailable, and offered as a suggestion when `prefers-reduced-motion` or `prefers-contrast: more` is set.
1. **Professional** (default): dark slate glass, thin type (Inter), restrained blue accent, slow gentle ring, subtle bloom, plain copy ("Projects").
2. **Retro Arcade**: black grid floor, neon cyan, magenta and yellow, pixel font (Press Start 2P), CRT scanlines plus slight curvature, cards as arcade-cabinet marquees, copy like "INSERT COIN TO LAUNCH". Draws on galaga, pole position and wordgame.
3. **Calm / Zen**: soft pastel gradient, rounded sans, very slow breathing-pace drift (about 4s in, 6s out), floating soft particles, no flashing, copy gentle and low-key. Draws on noself, inward and pockettone.
4. **Moose Mode**: deliberately chaotic and funny. Bright clashing colours, bobbing and wobbling cards, comic type, antler or moose motifs, absurd copy. Inspect the `moose` repo (`C:\code\moose`) for its actual personality and reuse any assets or jokes.

## Post-MVP Backlog (do NOT build now, record in the plan Backlog)

- **Neon Noir / Nightclub** (the "sexy, edgy" theme): black glass, magenta and violet glow, bass-pulse motion, confident smooth-talking copy. Tasteful, nothing explicit.
- **Mystic / Tarot**: candlelit, star-chart, drawing on arcana-veritas, zodiac and darkside.
- **Pub Night**: warm lighting, from myround and mingolfscore, silly copy.
- **Mini Golf**: cards on putting-green holes, windmill, a ball rolls to the selected hole.

## Acceptance Criteria

- [ ] The Basic theme ships no three.js code in its initial load (bundle test) and passes axe with zero violations at 200% zoom
- [ ] All five themes render the full manifest with no layout breakage
- [ ] Unit test: every theme satisfies the `Theme` type, with WCAG AA contrast checked for text on cards in every theme
- [ ] Unit test: adding a dummy fifth theme requires zero engine changes
- [ ] Playwright screenshot baselines for overview in each theme
- [ ] Switching themes 20 times leaks no GPU resources (disposal test)

## Out of Scope

- User-created custom themes
- Per-theme music (sound hook exists but defaults to off and ships empty)
