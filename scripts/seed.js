import pg from 'pg';
import { samplePlaces } from '../src/data.js';

if (!process.env.DATABASE_URL) {
  console.error('Add DATABASE_URL to .env before running npm run db:seed');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

await pool.query(`
  CREATE TABLE IF NOT EXISTS places (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    distance_km INTEGER NOT NULL,
    visit_minutes INTEGER NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    image TEXT NOT NULL,
    description TEXT NOT NULL,
    tip TEXT NOT NULL
  )
`);

await pool.query('TRUNCATE places RESTART IDENTITY');
for (const place of samplePlaces) {
  await pool.query(
    `INSERT INTO places
      (name, category, distance_km, visit_minutes, latitude, longitude, image, description, tip)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [place.name, place.category, place.distance, place.duration, place.lat, place.lng,
      place.image, place.description, place.tip]
  );
}

console.log(`Added ${samplePlaces.length} places to PostgreSQL.`);
await pool.end();
