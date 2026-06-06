# AGENTS.md — dental-lab-crm

## Purpose

Internal dental lab CRM for managing cases, dentists, patients, production flow, kanban, registry data, and operational visibility.

## Stack

* Next.js App Router
* React
* TypeScript
* Prisma with Supabase/Postgres
* Tailwind CSS
* shadcn/ui

## Main Architecture Goal

Build the app as a normal Next.js app, but keep the backend code shaped like a real API so it can be extracted later if needed.

Do not overengineer.

Current backend flow:

Page
→ Feature component/hook
→ Next.js API route
→ Service
→ Prisma
→ Supabase/Postgres

## Folder Structure

Use this structure:

app/
api/
cases/
route.ts
services.ts
[id]/
route.ts

```
cases/
  page.tsx
```

features/
cases/
components/
hooks/
cases.types.ts

lib/
prisma.ts

prisma/
schema.prisma

## Core Rules

1. `app/` is for routing, page composition, and Next.js API route modules.

Do not put Prisma queries, business rules, reusable domain logic, or large helpers inside page folders.

For API routes, keep the route handler and its small service module together under the resource folder.

Example:

`app/api/cases/route.ts`
`app/api/cases/services.ts`

2. `features/` is frontend-only.

Feature folders can contain:

* components
* hooks
* frontend types
* frontend helpers

Feature folders must not import:

* Prisma
* backend services
* database logic
* server-only code

3. `app/api/*/services.ts` is the internal backend service layer for now.

This is where backend service code lives.

For now, use services directly.

Do not create controllers, repositories, DTOs, mappers, adapters, factories, or extra abstraction layers unless the code clearly needs them later.

4. Route handlers act as the controller layer for now.

Example:

`app/api/cases/route.ts`

handles HTTP concerns:

* request parsing
* route params
* query params
* status codes
* JSON responses
* calling the service

5. Services handle business logic and database access.

Example:

`app/api/cases/services.ts`

This file can use Prisma directly for now.

6. Schemas handle validation.

Example:

`app/api/cases/schemas.ts`

Use schemas for request validation, especially for create and update operations.

## API Design Rules

Build APIs around resources, not pages.

Do not create routes like:

* `/api/getCases`
* `/api/getKanbanCases`
* `/api/getDashboardCases`

Use REST-style resource routes:

GET `/api/cases`
List cases.

POST `/api/cases`
Create a case.

GET `/api/cases/[id]`
Get one case.

PUT `/api/cases/[id]`
Update one case.

DELETE `/api/cases/[id]`
Delete one case.

Kanban, dashboard, production, and cases pages should all consume the same `/api/cases` resource.

If filtering is needed, use query params:

GET `/api/cases?status=production`
GET `/api/cases?limit=20`
GET `/api/cases?search=patientName`

## Working Rules

* Keep changes small and scoped.
* Fix root causes instead of stacking patches.
* Do not edit generated files.
* Never hardcode secrets or tokens.
* Do not add folders just because they sound clean.
* Only add abstraction when there is a real repeated problem.
* Prefer simple, readable code over enterprise patterns.

## Verification

Use the smallest relevant check:

* Run lint after app code changes.
* Run build after routing, Prisma, or config changes.
* Manually verify the affected workflow.

A task is complete only when:

* the feature works end-to-end
* old duplicated code was removed if replaced
* no unrelated churn was introduced
* risky or unfinished work is clearly called out
