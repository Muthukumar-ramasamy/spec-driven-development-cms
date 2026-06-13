# API Spec: Auth & User Management

Full OpenAPI definition: `specs/api/openapi.yaml`

---

## Endpoints

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| POST | /api/auth/signup | Create org + admin user | No | Any |
| POST | /api/auth/login | Authenticate, return JWT | No | Any |
| POST | /api/auth/logout | Clear session (client-side) | Yes | Any |
| POST | /api/auth/forgot-password | Send reset email | No | Any |
| POST | /api/auth/reset-password | Set new password via token | No | Any |
| POST | /api/auth/accept-invite | Accept invite + set password | No | Any |
| GET | /api/users | List users in org | Yes | Admin |
| POST | /api/users/invite | Invite team member | Yes | Admin |
| POST | /api/users/:id/resend-invite | Resend invite | Yes | Admin |
| PUT | /api/users/:id | Update role or status | Yes | Admin |
| DELETE | /api/users/:id | Deactivate user (soft) | Yes | Admin |

---

## Key Request / Response Shapes

### POST /api/auth/signup
```json
Request:  { "orgName": "string", "firstName": "string", "email": "string", "password": "string" }
Response: { "data": { "token": "jwt", "user": { "id": "uuid", "role": "admin" } } }
```

### POST /api/auth/login
```json
Request:  { "email": "string", "password": "string" }
Response: { "data": { "token": "jwt", "user": { "id", "firstName", "role", "organizationId" } } }
```

### POST /api/users/invite
```json
Request:  { "email": "string", "firstName": "string", "role": "admin|manager|sales_rep" }
Response: 201 { "data": { "id": "uuid", "email": "string", "status": "pending" } }
```

### PUT /api/users/:id (role / deactivate)
```json
Request:  { "role": "manager" } | { "status": "deactivated" }
Response: { "data": { "id": "uuid", "role": "manager", "status": "active" } }
```

---

## Error Codes

| Scenario | HTTP | Error code |
|----------|------|------------|
| Duplicate email on signup or invite | 409 | CONFLICT |
| Wrong credentials on login | 401 | UNAUTHORIZED |
| Deactivated user logs in | 403 | FORBIDDEN |
| Expired invite or reset token | 422 | UNPROCESSABLE |
| Deactivate last admin | 422 | UNPROCESSABLE |

---

## Security Notes

- JWT payload: `{ sub: userId, organizationId, role, iat, exp }`
- JWT TTL: 24 hours (ADR-003)
- `password_hash`, `invite_token`, `password_reset_token` must never appear in any response
- Rate limit: auth endpoints only (POST /api/auth/login, /forgot-password)
