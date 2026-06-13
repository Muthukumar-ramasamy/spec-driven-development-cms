# API Spec: Contact Management

Full OpenAPI definition: `specs/api/openapi.yaml`

---

## Endpoints

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| GET | /api/contacts | List contacts (paginated, searchable) | Yes | All |
| POST | /api/contacts | Create contact | Yes | All |
| GET | /api/contacts/:id | Get contact detail | Yes | All |
| PUT | /api/contacts/:id | Update contact | Yes | All (own) / Manager / Admin |
| DELETE | /api/contacts/:id | Soft-delete contact | Yes | Admin only |

---

## Key Request / Response Shapes

### GET /api/contacts (query params)
```
page, limit, sort, order, search (name/email), ownerId (Manager/Admin only)
```
Service automatically overrides `ownerId` to caller's ID for sales_rep role.

### POST /api/contacts
```json
Request:  {
  "firstName": "string (required)",
  "lastName": "string",
  "email": "string (email format)",
  "phone": "string",
  "jobTitle": "string",
  "companyId": "uuid",
  "source": "enum: contact_source"
}
Response: 201 { "data": { Contact } }
```

### GET /api/contacts/:id
```json
Response: {
  "data": {
    "id": "uuid",
    "firstName": "string",
    "email": "string | null",
    "company": { "id": "uuid", "name": "string" } | null,
    "owner": { "id": "uuid", "firstName": "string" },
    "deals": [ { Deal summary } ],
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

---

## Error Codes

| Scenario | HTTP | Error code |
|----------|------|------------|
| Duplicate email in org | 409 | CONFLICT |
| Edit contact not owned (sales rep) | 403 | FORBIDDEN |
| Non-admin delete | 403 | FORBIDDEN |
| Contact not found | 404 | NOT_FOUND |
