# Nawala Simple Day Planner

This is the beginner version of the Nawalapitiya tourism project. It keeps the useful project ideas and removes the advanced administration system.

## Features

- Browse 10 places with images
- Filter by category with HTMX
- View details for one place
- Show all places on a Leaflet map
- Show current Nawalapitiya weather
- Build a timed schedule from selected places
- Store the ten places in PostgreSQL through Drizzle ORM

## First run with PostgreSQL

1. Install Node.js 22.9 or newer and PostgreSQL 16, 17 or 18 on Windows.
2. Open this folder in VS Code.
3. Open **Terminal > New Terminal**.
4. Run `npm install`.
5. Copy `.env.example` to `.env`.
6. Run `npm run db:start`.
7. Run `npm run db:seed` once.
8. Run `npm run dev`.
9. Open `http://127.0.0.1:3001`.

`db:start` creates a project-local PostgreSQL database on port 5433. Run it again after restarting the computer. The local database listens only on this computer and uses trust authentication for this learning project.

Read the previously supplied **Nawala-Simple-Beginner-Guide.pdf** for explanations, build steps, troubleshooting, and viva questions.

## Updated weather and images (14 November 2026)

Weather uses Open-Meteo with an eight-second server timeout and a ten-minute cache. If the server cannot connect, the browser tries Open-Meteo directly. Retry requests weather again, and the observation time is displayed in Sri Lanka time. Internet access is required. No invented weather values are shown during an outage.

All ten records use local photo files. Six records use representative photos, identified on the Photo credits page with the actual pictured setting. Photo sources, authors and licences appear on the Photo credits page and in `public/images/credits.json`. These are not verified destination photos for those six places.

For an existing database, run `node --env-file=.env scripts/update-images.js` to update only the image paths. Do not run the seed command on a database with edits you want to keep: seeding replaces its place records.

For an easy first run without PostgreSQL, leave out `.env`, run `npm install`, then `npm start`. The application reads `src/data.js`.

The previously supplied beginner PDF covers the foundations. This README describes the latest weather behaviour, photo credits and the timed planner added since that guide. Run `npm test` for the eight automated checks.

## Important data note

The proposal supplied a preliminary list. Coordinates, access, hours, cost, safety, spelling, distance, and images must be verified before the app is used for real travel.
