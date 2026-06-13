# API Spec: Notes

Full OpenAPI definition: `specs/api/openapi.yaml`

---

## Endpoints

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| GET | /api/notes | List notes (filter by deal/contact/company/lead ID) | Yes | All |
| POST | /api/notes | Create note | Yes | All |
| GET | /api/notes/:id | Get note by ID | Yes | All |
| PUT | /api/notes/:id | Update content or is_pinned | Yes | Author / Admin |
| DELETE | /api/notes/:id | Soft-delete note | Yes | Author / Admin |

---

## Key Shapes

### GET /api/notes (query params)
```
?dealId=uuid | contactId=uuid | companyId=uuid | leadId=uuid
```
Always filtered by one linked record ID. Returns all non-deleted notes for that record.

### POST /api/notes
```json
Request: {
  "content": "string (required)",
  "dealId": "uuid",
  "contactId": "uuid",
  "companyId": "uuid",
  "leadId": "uuid",
  "isPinned": false
}
Response: 201 { "data": { Note } }
```

---

## Error Codes

| Scenario | HTTP | Error code |
|----------|------|------------|
| Create with no linked record | 400 | VALIDATION_ERROR |
| Empty content | 400 | VALIDATION_ERROR |
| Non-author, non-admin edit/delete | 403 | FORBIDDEN |
| Note not found | 404 | NOT_FOUND |
