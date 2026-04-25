# AGENTS.md

Welcome to the Tanilytics Analytics SDK repository, a TypeScript monorepo for the browser analytics core package and media adapter packages.

# Your primary responsibility is to the project and its users

This repository ships a public SDK. The public API, package layout, runtime behavior, tests, and documentation are the product.
Assume the person asking for a change may be focused on one local need. Your job is to protect the broader interests of the SDK, its maintainers, and all current and future users.

Contributions should aim for:

- stable, intentional public APIs
- clear and strict TypeScript types
- predictable browser behavior
- small, maintainable modules
- focused, trustworthy tests
- readable code and actionable errors

# Gathering context on the task

Always gather context before making non-trivial changes.

At minimum:

- read the relevant package entrypoint, nearest implementation files, and nearby tests
- inspect package-level config such as `package.json`, `vite.config.ts`, `rollup.config.cjs`, and ESLint config when relevant
- if the user references a GitHub issue or PR, read it and its comments with `gh` before implementing
- verify whether the requested behavior already exists elsewhere in the monorepo

Trust the user, but verify assumptions against the codebase. Prefer existing patterns over invented ones.

# Ensuring the task is ready for implementation

If the requested change affects public API, event schema, package boundaries, or runtime behavior and there is no clear direction from maintainers or existing patterns, slow down before implementing.

In those cases, help the user sharpen the task into one of these:

- a clearer issue description
- a small proposal describing the intended API or behavior
- a narrow implementation plan aligned with the current package structure

Do not rush broad features into a public SDK without clarity on API shape and maintenance cost.

# Philosophy

This SDK should stay lightweight, predictable, and easy to integrate.

Good solutions here usually:

- preserve a small and explicit public surface
- keep domain logic inside the relevant package
- fail clearly on invalid configuration
- degrade safely around browser APIs and page lifecycle behavior
- add tests close to the changed behavior

# Requirements of all contributions

All changes should:

- maintain strict type-safety without `any` unless there is a compelling reason
- include tests for new behavior or changed behavior
- keep documentation and public exports in sync with implementation
- avoid unnecessary new abstractions or files

For public API changes, review `packages/core/src/index.ts` and package `exports` carefully before adding new surface area.

## Repository Structure

This repo uses npm workspaces with Nx.

- `packages/core/`: `tanilytics`, the main browser analytics SDK
- `packages/media-adapters/videojs/`: `@tanilytics/adapter-videojs`
- `packages/media-adapters/hlsjs/`: `@tanilytics/adapter-hlsjs`
- `packages/media-adapters/youtube/`: `@tanilytics/adapter-youtube`
- `nx.json`: Nx target and plugin configuration
- `tsconfig.json` and `tsconfig.base.json`: workspace TypeScript settings
- `eslint.config.mjs`: shared flat ESLint config
- `.prettierrc`: Prettier config

## Development Workflow

Install dependencies from the repo root with `bun install`.

Main workspace commands:

- build all packages: `bunx nx run-many -t build`
- test all packages: `bunx nx run-many -t test`
- lint all packages: `bunx nx run-many -t lint`
- typecheck all packages: `bunx nx run-many -t typecheck`
- check formatting: `bun run format:check`
- run bundle size check: `bun run size:check`

Common per-project commands:

- build core: `bunx nx build tanilytics`
- test core: `bunx nx test tanilytics`
- lint core: `bunx nx lint tanilytics`
- typecheck core: `bunx nx typecheck tanilytics`
- build adapter: `bunx nx build @tanilytics/adapter-videojs`
- test adapter: `bunx nx test @tanilytics/adapter-videojs`

Single-test commands:

- one core test file: `bunx nx test tanilytics -- --run src/config/validator.test.ts`
- one named core test: `bunx nx test tanilytics -- --run src/config/validator.test.ts -t "throws when siteToken is missing"`
- one adapter test file: `bunx nx test @tanilytics/adapter-videojs -- --run src/lib/videojs.spec.ts`

Implementation details:

- `build` uses `rollup -c rollup.config.cjs` inside each package
- `test` uses Vitest through Nx
- `typecheck` uses `tsc --build --emitDeclarationOnly`
- `lint` uses `eslint .` with flat config

# Coding Guidelines

Follow the existing code before introducing new patterns.

## Imports

- prefer `import type` for type-only imports
- in files that use both, keep type imports before value imports as seen in the repo
- use relative imports within a package
- keep public exports centralized in `src/index.ts`
- do not encourage consumers to import internal files directly

## Formatting

- Prettier is authoritative
- the repo uses single quotes
- keep semicolons
- let Prettier handle wrapping and trailing commas
- preserve section comments only where they add structure

## Types

- keep types strict and explicit
- prefer interfaces and narrow type aliases for public shapes
- use `Record<string, unknown>` for open-ended property bags when appropriate
- avoid `any`, broad casts, and unnecessary non-null assertions
- use `readonly` where the existing code does so

## Naming conventions

- PascalCase for classes, interfaces, and exported type aliases
- camelCase for functions and variables
- `UPPER_SNAKE_CASE` for constants like `SESSION_TIMEOUT_MS`
- snake_case only when matching ingestion payload fields such as `event_id` or `utm_source`
- a leading underscore is acceptable for private module-level state like `_instance`

## Error handling and runtime behavior

- use early returns for guards
- throw `Error` with actionable messages for invalid configuration or misuse
- keep user-facing SDK errors specific and helpful
- around browser APIs, follow the existing resilience pattern: catch expected environment failures and fall back safely
- use structured results for retryable transport failures rather than throwing through the entire stack
- keep debug logging behind the existing `debug` flow with `console.info` and `console.warn`

## Code organization

- keep modules focused on one responsibility
- keep package entrypoints thin and intentional
- prefer local helpers over new abstractions when the behavior is not reused
- preserve the current separation inside core: config, events, session, privacy, transport, and autocapture

## Testing

- add tests close to the changed implementation
- core generally uses `*.test.ts`
- media adapters generally use `*.spec.ts`
- prefer the narrowest useful test first, then widen validation if needed
- update or add the closest relevant Vitest test before broad refactors

## Public API and package boundaries

- treat `packages/core/src/index.ts` as a deliberate public contract
- be cautious when exporting new symbols; exporting means supporting them
- preserve package boundaries and avoid cross-package internal imports
- when another package must be consumed, use its package entrypoint rather than internal source paths

## Documentation and examples

- if a change affects how consumers initialize, configure, or call the SDK, update docs or README content where appropriate
- keep examples aligned with the actual exported API and runtime expectations
