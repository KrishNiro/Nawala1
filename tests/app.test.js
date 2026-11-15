import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/server.js';
import { createWeatherLoader } from '../src/weather.js';

test('weather failures and incomplete measurements are rejected', async () => {
  await assert.rejects(createWeatherLoader(async () => ({ ok: false, status: 503 }))());
  await assert.rejects(createWeatherLoader(async () => ({ ok: true, json: async () => ({ current: {} }) }))());
  await assert.rejects(createWeatherLoader(async () => { throw new Error('Network blocked'); })());
});

test('successful weather is cached without another provider request', async () => {
  let calls = 0;
  const load = createWeatherLoader(async () => {
    calls++;
    return { ok: true, json: async () => ({current: { temperature_2m: 24, apparent_temperature: 26, weather_code: 3, wind_speed_10m: 5 }}) };
  });
  assert.deepEqual(await load(), await load());
  assert.equal(calls, 1);
});

test('home page shows the project and places', async () => {
  const response = await request(app).get('/');
  assert.equal(response.status, 200);
  assert.match(response.text, /Plan a simple day trip/);
  assert.match(response.text, /Galaboda Waterfalls/);
});

test('category filter returns only the selected category', async () => {
  const response = await request(app).get('/places/cards?category=Sports');
  assert.equal(response.status, 200);
  assert.match(response.text, /Jayathilaka Sports Complex/);
  assert.doesNotMatch(response.text, /Ambuluwawa Tower/);
});

test('a place detail page contains its coordinates', async () => {
  const response = await request(app).get('/place/1');
  assert.equal(response.status, 200);
  assert.match(response.text, /6\.987/);
  assert.match(response.text, /detail-map/);
});

test('unknown place returns 404', async () => {
  const response = await request(app).get('/place/999');
  assert.equal(response.status, 404);
});

test('map and planner pages load', async () => {
  const [map, planner] = await Promise.all([
    request(app).get('/map'),
    request(app).get('/planner')
  ]);
  assert.equal(map.status, 200);
  assert.equal(planner.status, 200);
  assert.match(map.text, /id="all-map"/);
  assert.match(planner.text, /id="planner-list"/);
  assert.match(planner.text, /id="start-time"/);
});

test('weather endpoint returns current weather data', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      current: { temperature_2m: 24, apparent_temperature: 25, weather_code: 2, wind_speed_10m: 7 }
    })
  });
  try {
    const response = await request(app).get('/api/weather');
    assert.equal(response.status, 200);
    assert.equal(response.body.temperature_2m, 24);
  } finally {
    global.fetch = originalFetch;
  }
});
