# API Spec: Activity & Task Tracking

Full OpenAPI definition: `specs/api/openapi.yaml`

---

## Endpoints

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| GET | /api/activities | List activities/tasks (filter by done, owner, record) | Yes | All |
| POST | /api/activities | Create activity or task | Yes | All |
| GET | /api/activities/:id | Get activity detail | Yes | All |
| PUT | /api/activities/:id | Update activity | Yes | All (own) |
| DELETE | /api/activities/:id | Soft-delete activity | Yes | All (own) / Admin |
| PUT | /api/activities/:id/done | Mark task as done | Yes | Owner |

---

## Key Shapes

### GET /api/activities (My Tasks)
```
?done=false&ownerId={me}&sort=dueDate&order=asc
```
Used by the My Tasks page to load open tasks for the logged-in user.

### PUT /api/activities/:id/done
```json
Request:  { "notes": "string (optional outcome note)" }
Response: 200 { "data": { Activity with done=true, doneAt=now } }
```

---

## Error Codes

| Scenario | HTTP | Error code |
|----------|------|------------|
| Create with no linked record | 400 | VALIDATION_ERROR |
| Mark already-done task done again | 400 | VALIDATION_ERROR |
| Edit another user's activity (sales rep) | 403 | FORBIDDEN |
| Activity not found | 404 | NOT_FOUND |
