import { drizzle } from 'drizzle-orm/node-postgres';
import { asc, eq } from 'drizzle-orm';
import pg from 'pg';
import { placesTable } from './schema.js';
import { samplePlaces } from './data.js';

// No DATABASE_URL means beginner mode: read the array in data.js.
// A DATABASE_URL means final mode: read the same fields from PostgreSQL.
const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const db = pool ? drizzle(pool) : null;
export const dataSource = db ? 'PostgreSQL' : 'sample data';

export async function getPlaces(category = 'All') {
  const rows = db
    ? await db.select().from(placesTable).orderBy(asc(placesTable.id))
    : samplePlaces;

  return category === 'All' ? rows : rows.filter((place) => place.category === category);
}

export async function getPlace(id) {
  if (db) {
    const rows = await db.select().from(placesTable).where(eq(placesTable.id, id));
    return rows[0];
  }
  return samplePlaces.find((place) => place.id === id);
}

export async function closeDatabase() {
  if (pool) await pool.end();
}
