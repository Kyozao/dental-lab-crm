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

### Cases

- `GET /api/cases`
- `POST /api/cases`
- `GET /api/cases/:id`
- `PATCH /api/cases/:id`
- `DELETE /api/cases/:id`
- `POST /api/cases/:id/attachments`
- `DELETE /api/cases/:id/attachments/:attachmentId`
- `POST /api/cases/downloads`

### Kanban

- `PATCH /api/kanban/cases/:id/status`

### Production

- `GET /api/production`
- `POST /api/production`
- `PATCH /api/production/:id`
- `DELETE /api/production/:id`

### Registry

- `GET /api/registry/bootstrap`
- `POST /api/registry/:entity`
- `PATCH /api/registry/:entity/:id`
- `DELETE /api/registry/:entity/:id`

### Notifications

- intentionally disabled for now

## Rule for contributors

Whenever a route is added or changed in `app/api/*`, update this file **and** `openapi.yaml` in the same task.
