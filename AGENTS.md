# AGENTS.md - Operational Guide

Keep this file under 60 lines. It's loaded every iteration.

## Project

Hub: a 3D (three.js) directory of Chris's deployed websites. Static site, deployed on Netlify.
Stack: Vite + TypeScript + vanilla three.js. Tests: Vitest (unit), Playwright (visual/smoke).
Specs live in `specs/`. Plan lives in `IMPLEMENTATION_PLAN.md`.

## Build Commands

```bash
npm run dev            # Development server
npm run build          # Production build (tsc + vite build)
npm run preview        # Serve production build
```

## Test Commands

```bash
npm test               # Vitest watch mode
npm run test:run       # Vitest once
npm run test:e2e       # Playwright smoke tests
```

## Data Commands

```bash
npm run sites:scan     # Rebuild data/sites.generated.json from local repos + GitHub + Netlify
npm run sites:shots    # Capture thumbnails to public/thumbs/ with Playwright
```

## Validation (run before finishing a task)

```bash
npm run check          # typecheck + lint + format:check + test:run
```

## Project Notes

- Windows 11, Git Bash. Local repos live in `C:\code\<name>`; use `/c/code` paths in bash.
- `gh` CLI is authenticated as ChrisBrooksbank. Use it for repo metadata, never hardcode tokens.
- Themes are plain config objects in `src/themes/`; the scene engine must not branch on theme name.
- `data/sites.overrides.json` is hand-edited and always wins over generated data.
- Sites with `hidden: true` must be stripped at build time, not just hidden in the UI.
- Respect `prefers-reduced-motion` everywhere; every 3D feature needs a non-3D equivalent.
