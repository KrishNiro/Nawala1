import { photoCreditsPage } from './views.js';
import { createWeatherLoader } from './weather.js';
import express from 'express';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dataSource, getPlace, getPlaces } from './database.js';
import {
  layout,
  homePage,
  placeCards,
  detailPage,
  mapPage,
  plannerPage,
  notFoundPage
} from './views.js';

const folder = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(folder, '..');
export const app = express();

// Files inside public are available directly in the browser.
app.use(express.static(path.join(root, 'public')));
app.use('/vendor/leaflet', express.static(path.join(root, 'node_modules/leaflet/dist')));
app.use('/vendor/htmx', express.static(path.join(root, 'node_modules/htmx.org/dist')));

app.get('/', async (request, response) => {
  const category = request.query.category || 'All';
  const places = await getPlaces(category);
  const allPlaces = await getPlaces();
  response.send(layout('Places', homePage(places, category), allPlaces));
});

// HTMX requests only this small piece instead of reloading the full page.
app.get('/places/cards', async (request, response) => {
  const places = await getPlaces(request.query.category || 'All');
  response.send(placeCards(places));
});

app.get('/place/:id', async (request, response) => {
  const place = await getPlace(Number(request.params.id));
  if (!place) return response.status(404).send(layout('Not found', notFoundPage()));
  response.send(layout(place.name, detailPage(place), [place]));
});

app.get('/photo-credits', (request, response) => {
  response.send(layout('Photo credits', photoCreditsPage()));
});

app.get('/map', async (request, response) => {
  const places = await getPlaces();
  response.send(layout('Map', mapPage(), places));
});

app.get('/planner', async (request, response) => {
  const places = await getPlaces();
  response.send(layout('My plan', plannerPage(), places));
});

const getWeather = createWeatherLoader((...args) => fetch(...args));
app.get('/api/weather', async (request, response) => {
  try {
    response.json(await getWeather());
  } catch (error) {
    console.error('Weather request failed:', error.cause?.code || error.message);
    response.status(503).json({ error: 'Weather provider could not be reached. Please retry.' });
  }
});

app.use((request, response) => {
  response.status(404).send(layout('Not found', notFoundPage()));
});

// Starting this file runs the web server. Tests can import app without starting it.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3001);
  app.listen(port, () => {
    console.log(`Nawala Simple is running at http://127.0.0.1:${port}`);
    console.log(`Place data source: ${dataSource}`);
  });
}
