const readPlaces = () => {
  const element = document.querySelector('#place-data');
  return element ? JSON.parse(element.textContent) : [];
};

const readPlan = () => JSON.parse(localStorage.getItem('nawala-plan') || '[]');
const savePlan = (ids) => localStorage.setItem('nawala-plan', JSON.stringify(ids));
const readStartTime = () => localStorage.getItem('nawala-start-time') || '08:30';
const saveStartTime = (time) => localStorage.setItem('nawala-start-time', time);

function updatePlanCount() {
  const count = document.querySelector('#plan-count');
  if (count) count.textContent = readPlan().length;
}

function addToPlan(id, button) {
  const ids = readPlan();
  if (!ids.includes(id)) {
    ids.push(id);
    savePlan(ids);
  }
  button.textContent = 'Added';
  updatePlanCount();
}

function addMapTiles(map) {
  L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    subdomains: 'abc',
    maxZoom: 17,
    attribution: '© OpenStreetMap contributors, SRTM | Map style © OpenTopoMap (CC-BY-SA)'
  }).addTo(map);
}

function showAllPlacesMap(elementId, places) {
  const element = document.querySelector(`#${elementId}`);
  if (!element || places.length === 0) return;

  const map = L.map(element).setView([7.055, 80.535], 11);
  addMapTiles(map);
  const markers = places.map((place) => L.marker([place.lat, place.lng])
    .addTo(map)
    .bindPopup(`<strong>${place.name}</strong><br><a href="/place/${place.id}">View details</a>`));
  map.fitBounds(L.featureGroup(markers).getBounds().pad(0.15));
}

function showDetailMap() {
  const element = document.querySelector('#detail-map');
  if (!element) return;
  const lat = Number(element.dataset.lat);
  const lng = Number(element.dataset.lng);
  const map = L.map(element).setView([lat, lng], 14);
  addMapTiles(map);
  L.marker([lat, lng]).addTo(map).bindPopup(element.dataset.name).openPopup();
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(totalMinutes) {
  const minutesInDay = 24 * 60;
  const safeMinutes = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return [hours && `${hours} hr`, remaining && `${remaining} min`].filter(Boolean).join(' ');
}

function showPlanner(places) {
  const list = document.querySelector('#planner-list');
  if (!list) return;

  const selected = readPlan().map((id) => places.find((place) => place.id === id)).filter(Boolean);
  let nextStart = timeToMinutes(readStartTime());
  const schedule = selected.map((place) => {
    const start = nextStart;
    const end = start + place.duration;
    nextStart = end + 30;
    return { place, start, end };
  });
  list.innerHTML = selected.length
    ? schedule.map(({ place, start, end }, index) => `
      <article class="plan-row">
        <span class="plan-number">${index + 1}</span>
        <img src="${place.image}" alt="">
        <div class="plan-details">
          <time>${formatTime(start)} - ${formatTime(end)}</time>
          <strong>${place.name}</strong>
          <small>${place.category} • ${place.duration} minute visit${index < selected.length - 1 ? ' • then 30 minutes travel' : ''}</small>
        </div>
        <button class="remove-place" data-id="${place.id}">Remove</button>
      </article>`).join('')
    : '<p class="empty">Your plan is empty. Return to Places and add one or two stops.</p>';

  const totalMinutes = selected.reduce((total, place) => total + place.duration, 0)
    + Math.max(0, selected.length - 1) * 30;
  const summary = document.querySelector('#schedule-summary');
  if (summary) summary.textContent = selected.length
    ? `${selected.length} stop${selected.length === 1 ? '' : 's'} • ${formatDuration(totalMinutes)}`
    : 'No stops selected';

  document.querySelectorAll('.remove-place').forEach((button) => {
    button.addEventListener('click', () => {
      savePlan(readPlan().filter((id) => id !== Number(button.dataset.id)));
      location.reload();
    });
  });

  const plannerMap = document.querySelector('#planner-map');
  if (selected.length) {
    showAllPlacesMap('planner-map', selected);
  } else if (plannerMap) {
    plannerMap.hidden = true;
  }
}

function weatherDescription(code) {
  if (code === 0) return 'Clear sky';
  if ([1, 2].includes(code)) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if ([45, 48].includes(code)) return 'Foggy';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([95, 96, 99].includes(code)) return 'Thunderstorms';
  return 'Cloudy';
}

async function loadWeather() {
  const summary = document.querySelector('#weather-summary');
  const values = document.querySelector('#weather-values');
  if (!summary || !values) return;
  try {
    summary.textContent = 'Loading current weather...';
    const sources = ['/api/weather', 'https://api.open-meteo.com/v1/forecast?latitude=7.0544&longitude=80.5346&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Asia%2FColombo'];
    let weather;
    for (const url of sources) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error('Weather unavailable');
        const data = await response.json();
        const current = data.current || data;
        if (!['temperature_2m', 'apparent_temperature', 'weather_code', 'wind_speed_10m'].every(key => Number.isFinite(current[key]))) throw new Error('Incomplete weather');
        weather = current;
        break;
      } catch { /* Try the browser connection when the server cannot reach the provider. */ }
    }
    if (!weather) throw new Error('Weather unavailable');
    document.querySelector('#weather-updated').textContent = weather.time
      ? 'Updated ' + weather.time.replace('T', ' ') + ' (Sri Lanka time)'
      : 'Latest available conditions';
    summary.textContent = weatherDescription(weather.weather_code);
    values.innerHTML = `
      <span><strong>${Math.round(weather.temperature_2m)}°C</strong> temperature</span>
      <span><strong>${Math.round(weather.apparent_temperature)}°C</strong> feels like</span>
      <span><strong>${Math.round(weather.wind_speed_10m)} km/h</strong> wind</span>`;
  } catch {
    summary.textContent = 'Current weather is unavailable';
    values.textContent = 'The weather service could not be reached. Check your connection, then press Retry.';
    document.querySelector('#weather-updated').textContent = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const places = readPlaces();
  const startInput = document.querySelector('#start-time');
  if (startInput) {
    startInput.value = readStartTime();
    startInput.addEventListener('change', () => {
      saveStartTime(startInput.value || '08:30');
      location.reload();
    });
  }
  updatePlanCount();
  loadWeather();
  showAllPlacesMap('all-map', places);
  showDetailMap();
  showPlanner(places);
  document.querySelector('#weather-retry')?.addEventListener('click', loadWeather);

  document.querySelector('#clear-plan')?.addEventListener('click', () => {
    savePlan([]);
    location.reload();
  });
});

// One delegated listener also works for cards that HTMX adds later.
document.addEventListener('click', (event) => {
  const button = event.target.closest('.add-place');
  if (button) addToPlan(Number(button.dataset.id), button);
});
