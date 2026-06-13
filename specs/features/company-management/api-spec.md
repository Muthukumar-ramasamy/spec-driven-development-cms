# API Spec: Company Management

Full OpenAPI definition: `specs/api/openapi.yaml`

---

## Endpoints

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| GET | /api/companies | List companies (paginated, searchable) | Yes | All |
| POST | /api/companies | Create company | Yes | All |
| GET | /api/companies/:id | Get company detail (with contacts, deals) | Yes | All |
| PUT | /api/companies/:id | Update company | Yes | All (own) / Manager / Admin |
| DELETE | /api/companies/:id | Soft-delete company | Yes | Admin only |

---

## Key Shapes

### POST /api/companies
```json
Request: { "name": "string (required)", "website": "string", "industry": "string", "employeeCount": 100 }
Response: 201 { "data": { Company } }
```

### GET /api/companies/:id
```json
Response: {
  "data": {
    "id": "uuid", "name": "string",
    "contacts": [ { ContactSummary } ],
    "deals": [ { DealSummary } ]
  }
}
```

---

## Error Codes

| Scenario | HTTP | Error code |
|----------|------|------------|
| Duplicate name in org | 409 | CONFLICT |
| Edit company not owned (sales rep) | 403 | FORBIDDEN |
| Non-admin delete | 403 | FORBIDDEN |
| Company not found | 404 | NOT_FOUND |
