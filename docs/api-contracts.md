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

## Reference archiving rule

Reference entities that can appear in case history are archived instead of hard-deleted:

- customers
- dentists
- lab customers
- service types
- processes
- CAD designers/users
- components
- block types
- milling drills

Archive means `isActive=false` and `deletedAt=<current timestamp>`. Default management lists and creation/dropdown option queries must only return rows where `isActive=true` and `deletedAt=null`, scoped to the logged-in user's dental lab. Historical case reads must include related archived records normally so old cases still show customer, dentist, service type, CAD designer, and case detail names.

Future entities referenced by cases must follow the same pattern: add `isActive` and `deletedAt`, use active-only option queries, archive on `DELETE`, and use restrictive relations so database hard deletes are blocked while cases still reference the row.

Service type workflow templates are stored as `service_types.workflowJson`. When a case is created with a `serviceTypeId`, the current workflow template is copied into real `case_processes` rows plus `case_process_dependencies`. Later service type or process edits do not rewrite existing case work.

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

- `GET /api/cases` supports `q`/`search`, `status`, `urgent`, `customerId`, and `limit`; `limit` defaults to `100` and is capped at `200`
- `GET /api/cases` returns lightweight summary rows inside `data` and includes `meta.limit`
- case list summary rows include scalar case fields plus display-ready `customerName`, `dentistName`, `serviceTypeName`, `cadDesignerName`, and `createdByUserName`
- case list summary rows do not include `processes`, workflow dependencies, attachments, components, or milling rows; use `GET /api/cases/:id` for rich case detail
- `POST /api/cases` requires `patientName`; `code` is backend-generated per dental lab and ignored if sent
- `POST /api/cases` rejects inactive, archived, or cross-lab reference IDs
- `POST /api/cases` snapshots the selected service type's `workflowJson` into `case_processes` and `case_process_dependencies` when `serviceTypeId` is present
- case process statuses are `locked`, `ready`, `in_progress`, `completed`, `skipped`, and `cancelled`
- case detail responses include `processes: [{ id, processId, processName, workflowStepId, status, assignedToId, assignedToName, dependsOnCaseProcessIds, startedAt, completedAt, createdAt, updatedAt }]`
- case reads include archived related reference rows for historical display
- `PATCH /api/cases/:id` updates editable case fields and replaces component rows when `components` is present
- attachment uploads create mock attachment records only; no Supabase storage upload occurs
- downloads return mock signed URLs

### Kanban

- `PATCH /api/kanban/cases/:id/status`

Current mock behavior:

- updates `currentStatus` and appends mock status history

### Production

- `GET /api/production`
- `PATCH /api/case-processes/:id`

Production behavior:

- `GET /api/production` returns queues grouped from `case_processes`, not service type workflow templates
- queues include case processes with status `ready` or `in_progress`
- `PATCH /api/case-processes/:id` can update status and assignee
- when a case process is marked `completed`, locked dependent case processes become `ready` only after all their dependencies are completed

### Reference Resources

- `GET /api/customers`
- `POST /api/customers`
- `PATCH /api/customers/:id`
- `DELETE /api/customers/:id`
- `GET /api/cad-designers`
- `POST /api/cad-designers`
- `PATCH /api/cad-designers/:id`
- `DELETE /api/cad-designers/:id`
- `GET /api/service-types`
- `POST /api/service-types`
- `PATCH /api/service-types/:id`
- `DELETE /api/service-types/:id`
- `GET /api/processes`
- `POST /api/processes`
- `PATCH /api/processes/:id`
- `DELETE /api/processes/:id`

Reference resource behavior:

- default `GET` list endpoints return active, unarchived rows only
- creation/dropdown consumers should use these active-only resource lists
- `DELETE` archives the row and returns the archived entity in the standard envelope
- archived rows are retained for historical case relationships and must not be removed by app runtime code
- service type responses include `workflowJson`
- service type create/update accepts `workflowJson: { steps: [{ id, processId, dependsOn }] }`
- service type workflow templates reject duplicate step ids, missing dependency step ids, self-dependencies, dependency cycles, inactive processes, archived processes, and processes outside the logged-in user's lab
- `/api/processes` manages reusable lab process definitions; `DELETE` archives processes instead of hard-deleting them

### Reports

- `GET /api/reports/cad-designer-cases` returns a disabled mock response

### Notifications

- intentionally disabled for now

## Rule for contributors

Whenever a route is added or changed in `app/api/*`, update this file **and** `openapi.yaml` in the same task.
