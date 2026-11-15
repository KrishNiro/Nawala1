import { pgTable, serial, text, integer, doublePrecision } from 'drizzle-orm/pg-core';

// Drizzle describes the PostgreSQL table in ordinary JavaScript.
export const placesTable = pgTable('places', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  distance: integer('distance_km').notNull(),
  duration: integer('visit_minutes').notNull(),
  lat: doublePrecision('latitude').notNull(),
  lng: doublePrecision('longitude').notNull(),
  image: text('image').notNull(),
  description: text('description').notNull(),
  tip: text('tip').notNull()
});
