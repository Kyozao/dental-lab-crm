# API Contracts — `dental-lab-crm`

This file is the **human-readable companion** to `openapi.yaml`, which is the machine-readable Swagger/OpenAPI contract for the web app and future phone app.

## Purpose

- document the actual request/response shapes for `app/api/*`
- keep humans and agents aligned
- make mobile integration easier
- reduce guessing when refactoring server actions into API routes
- complement the machine-readable definitions in `openapi.yaml`

## Standard response shape

```json
{
  "data": {},
  "error": null,
  "meta": {}
}
```

## Current mock runtime

The app currently runs in API-only demo mode:

- auth is bypassed; `GET /api/me` returns a fixed mock user
- Prisma, Supabase storage, push delivery, and `packages/backend` are not used at runtime
- mutations are in-memory and reset when the server restarts
- all routes return the standard `{ data, error, meta }` envelope

## Swagger / OpenAPI viewer

- in the app: `/swagger`
- raw machine-readable spec: `/api/openapi`
- source file to maintain: `openapi.yaml`
- both routes are intentionally disabled in `production` and should only be used in local/dev or controlled non-production environments

## Route documentation template

Use this format for each implemented route.

### `METHOD /api/example`

**Purpose**  
Short description of what the route does.

**Auth**  
`Required` | `Optional` | `Admin only`

**Input**

- query params:
- path params:
- headers:
- body:

```json
{}
```

**Success response**

```json
{
  "data": {},
  "error": null,
  "meta": {}
}
```

**Error response**

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Explain what went wrong"
  },
  "meta": {}
}
```

**Notes**

- mobile-specific behavior
- pagination details
- enum values
- file upload rules

---

## Planned route groups

### Auth

- `GET /api/me`

### Dashboard

- `GET /api/dashboard`

### Cases

- `GET /api/cases`
- `POST /api/cases`
- `GET /api/cases/:id`
- `PATCH /api/cases/:id`
- `DELETE /api/cases/:id`
- `POST /api/cases/:id/attachments`
- `DELETE /api/cases/:id/attachments/:attachmentId`
- `POST /api/cases/downloads`

Current mock behavior:

- `GET /api/cases` supports `q`/`search`, `status`, `urgent`, `clinicId`, `page`, and `pageSize`
- `POST /api/cases` requires `patientName` and accepts the case form payload, including component rows
- `PATCH /api/cases/:id` updates editable case fields and replaces component rows when `components` is present
- attachment uploads create mock attachment records only; no Supabase storage upload occurs
- downloads return mock signed URLs

### Kanban

- `PATCH /api/kanban/cases/:id/status`

Current mock behavior:

- updates `currentStatus` and appends mock status history

### Production

- `GET /api/production`
- `POST /api/production`
- `PATCH /api/production/:id`
- `DELETE /api/production/:id`

### Registry

- `GET /api/registry`
- `GET /api/registry/bootstrap`
- `POST /api/registry/:entity`
- `PATCH /api/registry/:entity/:id`
- `DELETE /api/registry/:entity/:id`

### Reports

- `GET /api/reports/cad-designer-cases` returns a disabled mock response

### Notifications

- intentionally disabled for now

## Rule for contributors

Whenever a route is added or changed in `app/api/*`, update this file **and** `openapi.yaml` in the same task.
