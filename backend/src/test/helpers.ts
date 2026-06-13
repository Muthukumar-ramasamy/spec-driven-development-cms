import { randomUUID } from 'crypto'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import jwt from 'jsonwebtoken'

const sql = neon(process.env.DATABASE_URL!)
export const testDb = drizzle(sql)

export async function seedOrganization(): Promise<string> {
  const id = randomUUID()
  const slug = `test-org-${id.slice(0, 8)}`
  await sql`
    INSERT INTO organizations (id, name, slug, created_at, updated_at)
    VALUES (${id}, ${'Test Org ' + id.slice(0, 8)}, ${slug}, NOW(), NOW())
  `
  return id
}

export async function seedUser(
  organizationId: string,
  role: 'admin' | 'manager' | 'sales_rep' = 'sales_rep',
  overrides: { status?: string; firstName?: string } = {},
): Promise<{ id: string; email: string; organizationId: string; role: string }> {
  const id = randomUUID()
  const email = `${id.slice(0, 8)}@test.com`
  const firstName = overrides.firstName ?? 'Test'
  const status = overrides.status ?? 'active'
  await sql`
    INSERT INTO users (id, organization_id, first_name, email, password_hash, role, status, created_at, updated_at)
    VALUES (${id}, ${organizationId}, ${firstName}, ${email}, 'hashed_for_tests', ${role}, ${status}, NOW(), NOW())
  `
  return { id, email, organizationId, role }
}

export function createTestToken(user: {
  id: string
  organizationId: string
  role: string
}): string {
  return jwt.sign(
    { sub: user.id, organizationId: user.organizationId, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  )
}

export async function cleanupOrg(organizationId: string): Promise<void> {
  const tables = [
    'notes', 'activities', 'deal_stage_history', 'deals',
    'leads', 'contacts', 'companies', 'pipeline_stages',
    'pipelines', 'users',
  ]
  for (const table of tables) {
    await sql`
      UPDATE ${sql(table)}
      SET deleted_at = NOW()
      WHERE organization_id = ${organizationId} AND deleted_at IS NULL
    `
  }
  await sql`
    UPDATE organizations SET deleted_at = NOW()
    WHERE id = ${organizationId} AND deleted_at IS NULL
  `
}
