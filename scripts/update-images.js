import pg from 'pg';
import { samplePlaces } from '../src/data.js';
// Update image paths only, keeping other database fields intact.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  for (const place of samplePlaces) {
    await pool.query('UPDATE places SET image=$1 WHERE id=$2 AND name=$3', [place.image, place.id, place.name]);
  }
  console.log('Location image paths updated.');
} finally {
  await pool.end();
}
