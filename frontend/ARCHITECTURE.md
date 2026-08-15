# Frontend Structure

This frontend follows a Next.js App Router structure where routing stays in `src/app` and product logic is grouped by feature outside of it.

## Structure

```text
src/
  app/
    (app)/         # Authenticated pages
    api/           # API routes (proxy to backend)
    layout.tsx     # Root layout
    globals.css    # Global styles
  features/        # Feature-specific UI, hooks, data mappers
  components/      # Reusable cross-feature components
  lib/             # Infrastructure (backend fetch, cookies, config)
  types/           # Shared domain types
  styles/          # Global styles

```

## Rules

- Keep routes, layouts, metadata, and route handlers in `src/app`.
- Put feature UI, hooks, API clients, and feature-local types in `src/features/<feature>`.
- Put reusable UI in `src/components` and infrastructure helpers in `src/lib`.
- Proxy every backend call through `src/app/api`; client components never call the backend directly.
- Use `.ts` for non-JSX files and `.tsx` for React components.
- Follow `src/features/console` when adding a feature.