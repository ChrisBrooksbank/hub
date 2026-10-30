# Hub

A directory of Chris's deployed websites: a deck of cards dealt onto a 3D (three.js) table, plus a plain list view. Static site, deployed on Netlify.

Stack: Vite + TypeScript (strict) + vanilla three.js + zod. Tests: Vitest (unit), Playwright (smoke/visual).
Specs live in `specs/`, the build plan in `IMPLEMENTATION_PLAN.md`.

## Commands

```bash
npm run dev            # Development server
npm run build          # Production build (tsc -b + vite build)
npm run preview        # Serve the production build

npm test               # Vitest watch mode
npm run test:run       # Vitest once
npm run test:e2e       # Playwright smoke tests

npm run check          # typecheck + lint + format:check + test:run
npm run knip           # Find unused files, exports and dependencies
```

A Husky pre-commit hook runs lint-staged (ESLint + Prettier) on staged files.

## Site manifest

The list of sites comes from two JSON files in `data/`:

- `data/sites.generated.json` is rebuilt by the scan (`npm run sites:scan`) from local repos, GitHub and Netlify. Do not edit it by hand.
- `data/sites.overrides.json` is hand-edited and always wins over generated data.

Thumbnails are captured with `npm run sites:shots` into `public/thumbs/`.

The scan and shots scripts are planned but not built yet. See `IMPLEMENTATION_PLAN.md`.

### Add a site

Add an entry to `data/sites.overrides.json` with at least `id`, `name`, `url`, `description` and `category`. A site with no repo is fine. Sites that live in a local repo or on GitHub are also picked up by the scan.

### Hide a site

Sites whose repo is private are marked `hidden: true` by the scan automatically. To force it either way, set `"hidden": true` or `"hidden": false` for that `id` in `data/sites.overrides.json`.

Hidden sites are stripped at build time, so they never appear in `dist/`, not just in the UI.

## Deploying

Netlify builds with `npm run build` and publishes `dist/` (see `netlify.toml`). CI (`.github/workflows/ci.yml`) runs `check` and the Playwright smoke tests on every push and PR.

### Manual setup (one time)

Creating the Netlify site is a manual step:

1. In Netlify, add a new site from the `ChrisBrooksbank/hub` GitHub repo.
2. Confirm it picks up the build command and publish directory from `netlify.toml`.
3. For the scan, set a Netlify token in the environment (`NETLIFY_AUTH_TOKEN`). Never commit tokens.

## Accessibility

Every 3D feature has a non-3D equivalent: the "List" view toggle (and the automatic fallback without WebGL) gives a plain, semantic list of sites. `prefers-reduced-motion` is respected everywhere.
