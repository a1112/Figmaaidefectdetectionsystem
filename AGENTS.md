# Repository Guidelines

This project is a Vite + React TypeScript single-page app for steel defect detection and backend management tooling.

## Project Structure & Module Organization

- `src/main.tsx`: App entrypoint, sets up router and theme provider.
- `src/App.tsx`: Main detection UI, orchestrates pages and layout.
- `src/components/`: Reusable UI, layout, backend, and modal components.
- `src/pages/`: High-level routed pages (e.g. `BackendManagement.tsx`).
- `src/src/api/` and `src/src/config/`: API client and environment config.
- `src/types/`: Shared TypeScript types.
- `src/styles/` and `src/index.css`: Global and utility styling.
- `src/TestData/`: Local mock JSON data for development.

Prefer adding new UI under `src/components` or `src/pages` rather than creating new top-level folders.

## Build, Test, and Development Commands

- `npm install` – Install dependencies.
- `npm run dev` – Start Vite dev server on port 3000.
- `npm run build` – Build production bundle into `build/`.

There is currently no dedicated test runner configured; manual validation through the dev server is expected.

## Coding Style & Naming Conventions

- Use TypeScript, React function components, and hooks.
- Indentation: 2 spaces, no tabs.
- Components: `PascalCase` filenames and exports (e.g. `StatusBar.tsx`).
- Non-component variables/functions: `camelCase`.
- Prefer existing utility classes and Tailwind-style className patterns already used in the codebase.

## Testing Guidelines

- For now, test by running `npm run dev` and exercising key flows:
  - Steel list loading, defect visualization, backend management route, and theme switching.
- When adding tests, follow `*.test.ts` / `*.test.tsx` naming and colocate near the code under test.

## Commit & Pull Request Guidelines

- Commits: concise, imperative summaries (e.g. `Add backend management shortcut`).
- PRs: include a short description, affected areas, and screenshots/GIFs for visible UI changes.
- Keep changes focused; avoid mixing refactors with feature work.

## Agent-Specific Instructions

- Always check for additional `AGENTS.md` files in subdirectories before editing files there.
- Make minimal, localized changes consistent with existing patterns.
- Do not introduce new build tools or frameworks without clear justification.

