import { readFileSync } from 'node:fs';
const credits = JSON.parse(readFileSync(new URL('../public/images/credits.json', import.meta.url), 'utf8'));
const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const safeJson = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');

function imageCaption(place) {
  const credit = credits.find(item => '/images/' + item.file === place.image);
  if (!credit) return '';
  return `<small class="image-credit">${credit.representative ? 'Representative photo — ' : ''}${escapeHtml(credit.label)} · ${escapeHtml(credit.artist)} · <a href="${escapeHtml(credit.source)}" target="_blank" rel="noopener">Source</a> · <a href="${escapeHtml(credit.licenseUrl)}" target="_blank" rel="noopener">${escapeHtml(credit.license)}</a></small>`;
}

export function layout(title, content, places = []) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | Nawala</title>
  <link rel="stylesheet" href="/vendor/leaflet/leaflet.css">
  <link rel="stylesheet" href="/style.css">
  <script src="/vendor/htmx/htmx.min.js" defer></script>
  <script src="/vendor/leaflet/leaflet.js" defer></script>
  <script src="/app.js" defer></script>
</head>
<body>
  <header class="site-header">
    <a class="brand" href="/">NAWALA <small>Day Planner</small></a>
    <nav aria-label="Main navigation">
      <a href="/">Places</a>
      <a href="/map">Map</a>
      <a href="/planner">My plan <span id="plan-count">0</span></a>
    </nav>
  </header>
  <main>${content}</main>
  <footer><a href="/photo-credits">Photo credits</a></footer>
  <script id="place-data" type="application/json">${safeJson(places)}</script>
</body>
</html>`;
}

export function placeCards(places) {
  if (places.length === 0) return '<p class="empty">No places found in this category.</p>';
  return places.map((place) => `
    <article class="card">
      <img src="${escapeHtml(place.image)}" alt="${escapeHtml(place.name)}" loading="lazy">
      <div class="card-body">
        <span class="tag">${escapeHtml(place.category)}</span>
        <h2>${escapeHtml(place.name)}</h2>
        <p>${escapeHtml(place.description)}</p>
        <p class="facts">${place.distance} km from town • ${place.duration} min visit</p>
        <div class="actions">
          <a class="button secondary" href="/place/${place.id}">View details</a>
          <button class="button add-place" data-id="${place.id}">Add to plan</button>
        </div>
      </div>
    </article>`).join('');
}

export function homePage(places, category) {
  const categories = ['All', 'Nature', 'Adventure', 'Religious', 'Sports'];
  const options = categories.map((item) =>
    `<option value="${item}" ${item === category ? 'selected' : ''}>${item}</option>`
  ).join('');

  return `
  <section class="hero">
    <div class="hero-text">
      <p class="eyebrow">Explore Nawalapitiya</p>
      <h1>Plan a simple day trip</h1>
      <p>Browse nearby places, see them on a map, and save a short personal plan.</p>
      <a class="button" href="#places">Find a place</a>
    </div>
  </section>
  <section class="weather-strip" aria-live="polite">
    <div>
      <p class="eyebrow">Nawalapitiya now</p>
      <h2 id="weather-summary">Loading current weather...</h2>
      <small id="weather-updated"></small>
      <p><a href="https://open-meteo.com/" target="_blank" rel="noopener">Weather by Open-Meteo</a> · <button type="button" id="weather-retry">Retry</button></p>
    </div>
    <div class="weather-values" id="weather-values"></div>
  </section>
  <section class="section" id="places">
    <div class="section-heading">
      <div><p class="eyebrow">10 suggested stops</p><h2>Choose what interests you</h2></div>
      <form action="/" method="get">
        <label for="category">Category</label>
        <select id="category" name="category" hx-get="/places/cards" hx-target="#place-grid" hx-trigger="change">
          ${options}
        </select>
      </form>
    </div>
    <div class="grid" id="place-grid">${placeCards(places)}</div>
  </section>`;
}

export function detailPage(place) {
  return `
  <section class="section detail">
    <a class="back" href="/">← Back to places</a>
    <div class="detail-grid">
      <img src="${escapeHtml(place.image)}" alt="${escapeHtml(place.name)}">
      <div>
        <span class="tag">${escapeHtml(place.category)}</span>
        <h1>${escapeHtml(place.name)}</h1>
        <p>${escapeHtml(place.description)}</p>
        <dl>
          <div><dt>Distance</dt><dd>${place.distance} km from town</dd></div>
          <div><dt>Suggested visit</dt><dd>${place.duration} minutes</dd></div>
          <div><dt>Location</dt><dd>${place.lat}, ${place.lng}</dd></div>
        </dl>
        <p class="tip"><strong>Visitor tip:</strong> ${escapeHtml(place.tip)}</p>
        <button class="button add-place" data-id="${place.id}">Add to plan</button>
      </div>
    </div>
    <div id="detail-map" class="map" data-lat="${place.lat}" data-lng="${place.lng}" data-name="${escapeHtml(place.name)}"></div>
  </section>`;
}

export function mapPage() {
  return `
  <section class="section">
    <p class="eyebrow">Interactive map</p>
    <h1>See every place</h1>
    <p>Click a marker to view the place name and open its details.</p>
    <div id="all-map" class="map large"></div>
  </section>`;
}

export function plannerPage() {
  return `
  <section class="section">
    <p class="eyebrow">Saved in this browser</p>
    <h1>My simple day plan</h1>
    <p>Select a starting time. Each stop uses its suggested visit time and a simple 30-minute travel allowance.</p>
    <div class="schedule-controls">
      <label for="start-time">Start time</label>
      <input id="start-time" type="time" value="08:30">
      <strong id="schedule-summary"></strong>
    </div>
    <div id="planner-list" class="planner-list"></div>
    <div class="planner-buttons">
      <a class="button secondary" href="/">Add more places</a>
      <button class="button danger" id="clear-plan">Clear plan</button>
    </div>
    <div id="planner-map" class="map"></div>
  </section>`;
}

export function notFoundPage() {
  return '<section class="section"><h1>Page not found</h1><p>The requested page does not exist.</p><a class="button" href="/">Go home</a></section>';
}

export function photoCreditsPage() {
  return `<section class="section"><h1>Photo credits</h1><p>Some photographs illustrate a similar setting rather than the named destination. These are identified below.</p>${credits.map(credit => `<article><h2>${escapeHtml(credit.file)}</h2>${imageCaption({image: "/images/" + credit.file})}</article>`).join('')}</section>`;
}
