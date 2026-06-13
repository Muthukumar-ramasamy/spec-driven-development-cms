# API Spec: Lead Management

Full OpenAPI definition: `specs/api/openapi.yaml`

---

## Endpoints

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| GET | /api/leads | List leads (paginated, filter by status/owner) | Yes | All |
| POST | /api/leads | Create lead | Yes | All |
| GET | /api/leads/:id | Get lead detail | Yes | All |
| PUT | /api/leads/:id | Update lead | Yes | All (own) / Manager / Admin |
| DELETE | /api/leads/:id | Soft-delete lead | Yes | Admin only |
| POST | /api/leads/:id/convert | Convert lead to deal | Yes | All (own) / Manager / Admin |

---

## Key Shapes

### POST /api/leads/:id/convert
```json
Request:  { "stageId": "uuid (required)" }
Response: 200 {
  "data": {
    "lead": { "id": "uuid", "status": "converted", "convertedAt": "ISO8601" },
    "deal": { "id": "uuid", "title": "string", "stageId": "uuid" }
  }
}
```

---

## Error Codes

| Scenario | HTTP | Error code |
|----------|------|------------|
| Convert already-converted lead | 422 | UNPROCESSABLE |
| Convert without stageId | 400 | VALIDATION_ERROR |
| Non-admin delete | 403 | FORBIDDEN |
| Lead not found | 404 | NOT_FOUND |
