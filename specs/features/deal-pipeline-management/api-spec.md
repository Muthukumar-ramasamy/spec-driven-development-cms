# API Spec: Deal & Pipeline Management

Full OpenAPI definition: `specs/api/openapi.yaml`

---

## Endpoints

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| GET | /api/deals | List deals (filter by status/owner/stage) | Yes | All |
| POST | /api/deals | Create deal | Yes | All |
| GET | /api/deals/:id | Get deal detail (with stage history) | Yes | All |
| PUT | /api/deals/:id | Update deal | Yes | All (own) / Manager / Admin |
| DELETE | /api/deals/:id | Soft-delete deal | Yes | Admin |
| POST | /api/deals/:id/won | Mark deal as won | Yes | All (own) |
| POST | /api/deals/:id/lost | Mark deal as lost + reason | Yes | All (own) |
| GET | /api/pipeline-stages | List pipeline stages for org | Yes | All |
| POST | /api/pipeline-stages | Create stage | Yes | Admin |
| PUT | /api/pipeline-stages/:id | Update stage name/probability | Yes | Admin |
| DELETE | /api/pipeline-stages/:id | Delete stage (blocked if open deals) | Yes | Admin |
| PUT | /api/pipeline-stages/reorder | Reorder stages | Yes | Admin |

---

## Key Shapes

### POST /api/deals/:id/lost
```json
Request:  { "lostReason": "string (required)" }
Response: 200 { "data": { Deal with status=lost, lostAt, lostReason } }
```

### PUT /api/pipeline-stages/reorder
```json
Request:  { "stages": [ { "id": "uuid", "displayOrder": 1 }, ... ] }
Response: 200 { "data": [ { PipelineStage } ] }
```

---

## Error Codes

| Scenario | HTTP | Error code |
|----------|------|------------|
| Mark lost without reason | 400 | VALIDATION_ERROR |
| Delete stage with open deals | 422 | UNPROCESSABLE |
| Delete last stage | 422 | UNPROCESSABLE |
| Deal not found | 404 | NOT_FOUND |
