# Project Foundation

## Overview

A typed, linted, tested Vite project deploys to Netlify with CI guardrails so autonomous iterations get fast, reliable feedback.

## User Stories

- As the owner, I want guardrails on every commit so that unattended loops can't land broken code.
- As the owner, I want pushes to deploy automatically so that the hub is always current.

## Requirements

- [ ] Vite + TypeScript (strict) + vanilla three.js project in `C:\code\hub`, initialised as a git repo with a `main` branch
- [ ] ESLint, Prettier, Vitest, Knip, Husky pre-commit (lint-staged), Playwright; follow the conventions of the `cb-new-project` skill and sibling repos such as `C:\code\life` and `C:\code\earth`
- [ ] `npm run check` = typecheck + lint + format:check + test:run (the loop's backpressure command)
- [ ] `netlify.toml` (build command, publish dir `dist`, security headers, SPA fallback)
- [ ] GitHub Actions workflow running `check` and the Playwright smoke tests on push and PR
- [ ] README with the purpose, commands and how to add or hide a site
- [ ] Module layout: `src/engine/`, `src/themes/`, `src/data/`, `src/ui/`, `scripts/` (scan and shots), `data/`, `public/thumbs/`
- [ ] Dependency policy: three.js plus `zod`; dev-only for sharp and Playwright; no UI framework

## Acceptance Criteria

- [ ] Fresh clone then `npm ci && npm run check && npm run build` succeeds
- [ ] CI is green on the first push
- [ ] Pre-commit hook blocks a commit with a lint error

## Out of Scope

- Custom domain setup
- Netlify site creation (the owner does this manually, and the plan should list it as a manual step)
