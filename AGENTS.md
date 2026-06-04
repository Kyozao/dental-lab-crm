<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — `dental-lab-crm`

## Purpose

Internal dental lab CRM for managing case intake, kanban flow, production, registry data, and operational visibility.

## Stack

- `Next.js 16` App Router + `React 19` + `TypeScript`
- `Prisma 7` with Postgres/Supabase
- `Tailwind CSS` + `shadcn/ui`

## Working Rules

1. Keep changes small, scoped, and easy to review.
2. Fix root causes instead of layering quick patches.
3. Do **not** edit generated output unless the source file requires it.
4. Never commit secrets from `.env` or hardcode credentials/tokens.

## API-First Direction (Mobile App Support)

This project should move toward an **API-first** structure so the same backend can serve both the web app and a future phone app.

Current runtime:

- `app/api/*` route handlers are the deployed API on Vercel/Next.js.
- Route handlers should be thin adapters: translate Next `Request`/params/auth into backend calls and serialize backend response objects.
- Do not put Prisma queries, workflow rules, or mutation business logic directly in `app/api/*` route handlers.

Target backend ownership:

- backend implementation belongs in `packages/backend/src`
- shared request/response contracts and Zod schemas belong in `packages/contracts/src`
- feature backend code should be shaped as controllers, services, and repositories
- future extraction should be able to mount the same controllers/services in a Fastify API without rewriting business logic

Rules for new work:

- business logic should not live only inside UI components or server actions
- prefer shared domain logic + `app/api/*` endpoints for data the mobile app will need
- server actions may remain as thin wrappers for the web UI during migration, but the long-term source of truth should be the API layer
- validate request payloads with the same Zod schemas from `packages/contracts/src/*` or `lib/validators/*` while older features are being migrated
- keep response shapes predictable for mobile clients (for example: `data`, `error`, `meta`)
- keep frontend feature folders frontend-only: UI components, browser API clients, frontend-only types/helpers
- do not add Prisma, auth mutation logic, or backend services to frontend feature folders

Priority API areas:

1. auth/session bootstrap for the mobile app
2. cases CRUD and case details
3. kanban board reads + status updates
4. production tracking
5. registry/reference data
6. file upload/download endpoints
7. notifications only after a proper backend contract is defined

## API Documentation Rule

Keep `AGENTS.md` high-level.

For the **actual** request/response contracts, document them in:

- `docs/api-contracts.md` for human-readable notes
- `openapi.yaml` for the machine-readable Swagger/OpenAPI contract

When implementing or changing any route in `app/api/*`, update both docs with:

- method + path
- auth requirements
- request params/body
- success response shape
- error response shape
- notes for mobile usage

Agents should use `AGENTS.md` for direction, `docs/api-contracts.md` for notes, and `openapi.yaml` for the exact route contract.

## Project Map

- `app/cases/*` — case intake and case detail workflows
- `app/kanban/*` — production board and case movement
- `app/production/*` — production views and status tracking
- `app/registry/*` — admin/reference data management
- `app/notifications/*` — notification actions; treat as experimental and verify carefully
- `packages/backend/src/features/*` — backend controllers, services, repositories, and future route registrations
- `packages/contracts/src/*` — shared Zod schemas and API contract types
- `lib/auth/*` — auth/session helpers
- `lib/prisma.ts` — shared Prisma client
- `lib/validators/*` — Zod schemas and input validation
- `components/ui/*` — reusable UI primitives

## Data + Auth Conventions

- Use `getAuthenticatedAppUser()` for server-side user checks.
- Use the shared `prisma` client from `lib/prisma.ts`.
- New backend Prisma reads/writes should live in `*.repository.ts`.
- Business rules and workflow coordination should live in `*.service.ts`.
- API request validation and response shaping should live in `*.controller.ts` and shared contracts.
- `*.routes.ts` files are reserved for future Fastify route registration and should not be required by Next route handlers.
- Put shared validation in `packages/contracts/src/*`; use `lib/validators/*` only for older code that has not moved yet.
- If the Prisma schema changes, update `prisma/schema.prisma` and verify migrations deliberately.

## Notification Policy (Important)

The recent notification work is currently treated as **paused / needs redesign**.

When touching notifications:

- prefer simplifying or rolling back incomplete behavior rather than stacking more fixes on top
- separate concerns clearly: in-app feed, browser permission, push subscription, service worker delivery, realtime updates
- define the success criteria before coding
- verify the real user flow end-to-end before calling it done

If a notification change cannot be verified locally, do **not** expand the feature further.

## Verification

Use the smallest relevant check for the change:

- `npm run lint` — required for app code changes
- `npm run build` — required for routing, server actions, Prisma, or config changes
- manual verification for auth, case flow, kanban, and notifications

## Definition of Done

A task is only complete when:

- the affected workflow still makes sense for lab staff
- verification was actually run and the result is recorded
- no unrelated churn was introduced
- any risky or unfinished work is explicitly called out
