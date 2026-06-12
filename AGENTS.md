# AGENTS.md — dental-lab-crm

## Purpose

Dental lab CRM for managing cases, dentists, patients, production flow, registry data, and operational visibility.

## Stack

* Next.js App Router
* React
* TypeScript
* Prisma
* Supabase/Postgres
* Tailwind CSS
* shadcn/ui

## Architecture Goal

Build a normal Next.js app, but keep backend code shaped like a real API so it can be extracted later if needed.

Do not overengineer.

## Folder Structure

```txt
app/
  api/
    cases/
      route.ts
      cases.services.ts
      cases.schemas.ts
      [id]/
        route.ts

  cases/
    page.tsx

features/
  cases/
    components/
    hooks/
    cases.types.ts

lib/
  prisma.ts

prisma/
  schema.prisma
```

## Dependency Direction

Allowed direction:

```txt
app → features
app/api → services → prisma
```

Rules:

* Pages compose UI and call feature hooks/components.
* Feature code is frontend-only.
* API routes call services.
* Services may use Prisma.
* Never import Prisma into `features/`.
* Never import API services into `features/`.
* Never import from a higher layer.

## App Layer Rules

`app/` is for:

* routing
* page composition
* layouts
* Next.js API route modules

Do not put Prisma queries, business rules, reusable domain logic, or large helpers inside page folders.

## Feature Layer Rules

`features/` is frontend-only.

Feature folders may contain:

* components
* hooks
* frontend types
* frontend helpers
* API client functions used by hooks

Feature folders must not contain:

* Prisma code
* backend services
* database logic
* server-only logic

## API Layer Rules

Route handlers act as the controller layer.

Route handlers handle:

* request parsing
* route params
* query params
* validation
* status codes
* JSON responses
* calling services

Services handle:

* business logic
* authorization checks
* Prisma queries
* database writes

Use Prisma directly inside services for now.

Do not create controllers, repositories, DTOs, mappers, adapters, factories, or extra abstraction layers unless there is a real repeated problem.

## Validation Rules

Use schemas for request validation, especially for create and update operations.

Example:

```txt
app/api/cases/cases.schemas.ts
```

Validate external input before using it in services.

## Auth and Authorization Rules

Protected API routes must identify the user and resolve what the user is allowed to access before querying data.

Do not assume a user can access a resource just because they are logged in.

Every protected query must be scoped by the user’s authorization context.

Examples of authorization context:

* the user’s lab
* the user’s memberships
* the user’s role
* the user’s permissions
* the resource owner

For now, keep this flexible. Do not hardcode the assumption that each user has only one lab or many labs unless the product decision is already made.

Services should receive or resolve the authorization context before accessing protected data.

## API Design Rules

Build APIs around resources, not pages.

Do not create routes like:

```txt
/api/getCases
/api/getKanbanCases
/api/getDashboardCases
```

Use REST-style resource routes:

```txt
GET    /api/cases
POST   /api/cases
GET    /api/cases/[id]
PUT    /api/cases/[id]
DELETE /api/cases/[id]
```

Pages consume resources, not page-specific endpoints.

Use query params for filtering:

```txt
GET /api/cases?status=production
GET /api/cases?limit=20
GET /api/cases?search=patientName
```

## Working Rules

* Keep changes small and scoped.
* Fix root causes instead of stacking patches.
* Do not edit generated files.
* Only add abstraction when there is a real repeated problem.
* Prefer simple, readable code over enterprise patterns.
* Never use `any`.
* Remove old duplicated code when replacing it.
* Do not introduce unrelated churn.

## Verification

Use the smallest relevant check:

* Run lint after app code changes.
* Run build after routing, Prisma, or config changes.
* Manually verify the affected workflow.

A task is complete only when:

* the feature works end-to-end
* replaced duplicated code was removed
* no unrelated churn was introduced
* risky or unfinished work is clearly called out
