# Command: /scaffold

**Usage**: `/scaffold`

No arguments. Run once at the start of Phase implementation.

---

## What this command does

Creates the complete project folder structure for the CRM — frontend and backend scaffolding, configuration files, and test infrastructure. This is the one-time setup before `/implement-feature` can run.

Run this before any `/implement-feature` command.

---

## Step 0 — Pre-flight check

Check if scaffolding has already been done:

If `backend/src/` exists:
> "Scaffold already complete — backend/src/ exists. Run /spec-status to see current state."
Stop.

If `frontend/src/` exists:
> "Scaffold already complete — frontend/src/ exists. Run /spec-status to see current state."
Stop.

---

## Step 1 — Backend scaffolding

Create the following directory structure and files:

```
backend/
├── src/
│   ├── app.ts                    ← Fastify instance + plugin registration
│   ├── server.ts                 ← Entry point: starts server
│   ├── config.ts                 ← Zod-validated environment variables
│   ├── db/
│   │   ├── index.ts              ← Drizzle + Neon connection
│   │   └── schema/               ← Entity schema files (one per entity)
│   ├── lib/
│   │   ├── errors.ts             ← NotFoundError, ConflictError, ForbiddenError, UnprocessableError
│   │   ├── auth.ts               ← JWT verify helper, JWTPayload type
│   │   └── pagination.ts         ← buildPaginationMeta helper
│   ├── middleware/
│   │   ├── authenticate.ts       ← fastify-jwt preHandler (verifies Bearer token)
│   │   └── authorize.ts          ← Role check decorator factory
│   └── modules/                  ← Feature modules (one per /implement-feature run)
├── drizzle/                      ← Migration SQL files
├── drizzle.config.ts             ← Drizzle Kit config
├── package.json
├── tsconfig.json
└── .env.example
```

### Key file contents

**`src/lib/errors.ts`**:
```typescript
export class NotFoundError extends Error {
  statusCode = 404
  constructor(entity = 'Record') { super(`${entity} not found`) }
}
export class ConflictError extends Error {
  statusCode = 409
  constructor(message: string) { super(message) }
}
export class ForbiddenError extends Error {
  statusCode = 403
  constructor(message = 'Insufficient permissions') { super(message) }
}
export class UnprocessableError extends Error {
  statusCode = 422
  constructor(message: string) { super(message) }
}
```

**`src/config.ts`** (Zod validation of env vars):
```typescript
import { z } from 'zod'
const schema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  FRONTEND_URL: z.string().url(),
})
export const config = schema.parse(process.env)
```

---

## Step 2 — Frontend scaffolding

Create:
```
frontend/
├── src/
│   ├── main.tsx                  ← ReactDOM.render + QueryClientProvider
│   ├── App.tsx                   ← Router setup
│   ├── router.tsx                ← Route definitions (updated by /implement-feature)
│   ├── lib/
│   │   ├── api.ts                ← Axios instance + auth interceptors
│   │   ├── auth.ts               ← getToken / setToken / clearToken (localStorage)
│   │   └── queryClient.ts        ← TanStack QueryClient config
│   ├── components/
│   │   ├── ui/                   ← shadcn/ui component re-exports
│   │   ├── ProtectedRoute.tsx    ← Redirects to /login if no token
│   │   ├── AppLayout.tsx         ← Sidebar (240px) + main content layout
│   │   └── AuthLayout.tsx        ← Centered card layout for auth pages
│   ├── hooks/
│   │   └── useAuth.ts            ← Returns decoded JWT payload (user, role, orgId)
│   └── features/                 ← Feature modules (one per /implement-feature run)
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

### Key file contents

**`src/lib/api.ts`** (Axios instance):
```typescript
import axios from 'axios'
import { getToken, clearToken } from './auth'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      clearToken()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

**`src/lib/auth.ts`**:
```typescript
const TOKEN_KEY = 'crm_token'
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)
```

---

## Step 3 — Test infrastructure

Create:
```
backend/src/test/
├── helpers.ts        ← seedOrganization, seedUser, cleanupOrg, createTestToken
└── setup.ts          ← Global test setup (DB connection, env vars)

e2e/
├── helpers.ts        ← loginAs, createContact, etc. (page helper functions)
└── fixtures/         ← Shared test data factories

vitest.config.ts      ← Unit + integration test config
playwright.config.ts  ← E2E test config
```

---

## Step 4 — Package.json scripts

Ensure these scripts exist in both `backend/package.json` and `frontend/package.json`:

**Backend**:
```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "test:unit": "vitest run --project unit",
    "test:integration": "vitest run --project integration",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
}
```

**Frontend**:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test:e2e": "playwright test"
  }
}
```

---

## Step 5 — .env.example files

**`backend/.env.example`**:
```
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
JWT_SECRET=replace-with-32-char-minimum-secret-key
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**`frontend/.env.example`**:
```
VITE_API_URL=http://localhost:3000
```

---

## Step 6 — Summary

```
✅ Scaffold complete

Created:
  backend/src/           — Fastify app structure
  backend/drizzle/       — Migrations directory
  frontend/src/          — React + Vite app structure
  e2e/                   — Playwright E2E test directory
  vitest.config.ts
  playwright.config.ts

Next steps:
  1. Copy .env.example to .env in both backend/ and frontend/
  2. Set DATABASE_URL to your Neon connection string
  3. Set JWT_SECRET to a random 32+ character string
  4. Run: /approve-spec AuthUserManagement
  5. Run: /implement-feature AuthUserManagement
```

---

## Rules

- Run only once — stop if backend/src/ or frontend/src/ already exists
- Do not implement any feature logic — only infrastructure files
- Do not modify spec files
- All generated TypeScript must compile without errors
