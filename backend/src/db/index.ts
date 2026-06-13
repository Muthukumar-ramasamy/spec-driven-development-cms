import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { config } from '../config'

const sql = neon(config.DATABASE_URL)
export const db = drizzle(sql)
