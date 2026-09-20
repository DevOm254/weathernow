const express = require('express');
const axios = require('axios');
const db = require('../db');

const router = express.Router();

// WMO Weather code mapping
const WMO_CODE_MAP = {
  0: { label: 'Clear Sky', icon: 'Sun' },
  1: { label: 'Mainly Clear', icon: 'SunDim' },
  2: { label: 'Partly Cloudy', icon: 'CloudSun' },
  3: { label: 'Overcast', icon: 'Cloud' },
  45: { label: 'Foggy', icon: 'CloudFog' },
  48: { label: 'Depositing Rime Fog', icon: 'CloudFog' },
  51: { label: 'Light Drizzle', icon: 'CloudDrizzle' },
  53: { label: 'Moderate Drizzle', icon: 'CloudDrizzle' },
  55: { label: 'Dense Drizzle', icon: 'CloudDrizzle' },
  61: { label: 'Slight Rain', icon: 'CloudRain' },
  63: { label: 'Moderate Rain', icon: 'CloudRain' },
  65: { label: 'Heavy Rain', icon: 'CloudRain' },
  66: { label: 'Light Freezing Rain', icon: 'CloudHail' },
  67: { label: 'Heavy Freezing Rain', icon: 'CloudHail' },
  71: { label: 'Slight Snow', icon: 'CloudSnow' },
  73: { label: 'Moderate Snow', icon: 'CloudSnow' },
  75: { label: 'Heavy Snow', icon: 'CloudSnow' },
  77: { label: 'Snow Grains', icon: 'CloudSnow' },
  80: { label: 'Slight Rain Showers', icon: 'CloudRain' },
  81: { label: 'Moderate Rain Showers', icon: 'CloudRain' },
  82: { label: 'Violent Rain Showers', icon: 'CloudLightning' },
  85: { label: 'Slight Snow Showers', icon: 'CloudSnow' },
  86: { label: 'Heavy Snow Showers', icon: 'CloudSnow' },
  95: { label: 'Thunderstorm', icon: 'CloudLightning' },
  96: { label: 'Thunderstorm with Slight Hail', icon: 'CloudLightning' },
  99: { label: 'Thunderstorm with Heavy Hail', icon: 'CloudLightning' }
};

function getWeatherCondition(code) {
  return WMO_CODE_MAP[code] || { label: 'Variable', icon: 'CloudSun' };
}

// 1. Reverse Geocoding (Lat/Lon -> City, District/State, Country)
router.get('/reverse-geocode', async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ error: 'Valid lat and lon query parameters required.' });
  }

  try {
    // OpenStreetMap Nominatim with fallback
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat,
        lon,
        format: 'json',
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'WeatherNow-App/1.0 (contact@weathernow.local)'
      },
      timeout: 5000
    });

    const addr = response.data.address || {};
    const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || 'Unknown City';
    const state = addr.state || addr.state_district || addr.region || '';
    const country = addr.country || '';

    res.json({
      city,
      district: addr.state_district || addr.county || state,
      state,
      country,
      formatted: `${city}${state ? `, ${state}` : ''}${country ? `, ${country}` : ''}`,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon)
    });
  } catch (err) {
    console.warn('[Geocode] Nominatim error or timeout, trying fallback:', err.message);
    // Fallback: simple response
    res.json({
      city: 'Current Location',
      district: '',
      state: '',
      country: '',
      formatted: `Lat: ${parseFloat(lat).toFixed(2)}, Lon: ${parseFloat(lon).toFixed(2)}`,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon)
    });
  }
});

// 2. City search autocomplete / resolution
router.get('/search-city', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters.' });
  }

  try {
    const response = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
      params: {
        name: q.trim(),
        count: 5,
        language: 'en',
        format: 'json'
      },
      timeout: 5000
    });

    const results = (response.data.results || []).map((item) => ({
      id: item.id,
      name: item.name,
      state: item.admin1 || '',
      country: item.country || '',
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: item.timezone
    }));

    res.json({ results });
  } catch (err) {
    console.error('[City Search Error]', err.message);
    res.status(500).json({ error: 'Failed to search cities.' });
  }
});

// 3. Complete Weather Data
router.get('/data', async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ error: 'Valid lat and lon are required.' });
  }

  try {
    const weatherRes = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'precipitation',
          'rain',
          'weather_code',
          'surface_pressure',
          'wind_speed_10m',
          'wind_direction_10m'
        ].join(','),
        hourly: [
          'temperature_2m',
          'relative_humidity_2m',
          'weather_code',
          'precipitation_probability',
          'visibility',
          'uv_index'
        ].join(','),
        daily: [
          'weather_code',
          'temperature_2m_max',
          'temperature_2m_min',
          'sunrise',
          'sunset',
          'uv_index_max',
          'precipitation_probability_max'
        ].join(','),
        timezone: 'auto'
      },
      timeout: 8000
    });

    const data = weatherRes.data;
    const current = data.current;
    const daily = data.daily;
    const hourly = data.hourly;

    const condition = getWeatherCondition(current.weather_code);

    // Current hour index in hourly forecast
    const nowISO = new Date().toISOString().slice(0, 13); // 'YYYY-MM-DDTHH'
    let currentHourIndex = hourly.time.findIndex(t => t.startsWith(nowISO));
    if (currentHourIndex === -1) currentHourIndex = 0;

    // Next 24 hours
    const next24Hours = [];
    for (let i = currentHourIndex; i < Math.min(currentHourIndex + 24, hourly.time.length); i++) {
      const hCond = getWeatherCondition(hourly.weather_code[i]);
      next24Hours.push({
        time: hourly.time[i],
        temperature: Math.round(hourly.temperature_2m[i]),
        condition: hCond.label,
        icon: hCond.icon,
        rainProbability: hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0,
        humidity: hourly.relative_humidity_2m[i]
      });
    }

    // 7-day forecast
    const sevenDayForecast = [];
    for (let i = 0; i < daily.time.length; i++) {
      const dCond = getWeatherCondition(daily.weather_code[i]);
      sevenDayForecast.push({
        date: daily.time[i],
        maxTemp: Math.round(daily.temperature_2m_max[i]),
        minTemp: Math.round(daily.temperature_2m_min[i]),
        condition: dCond.label,
        icon: dCond.icon,
        rainProbability: daily.precipitation_probability_max[i] || 0,
        uvIndex: daily.uv_index_max[i] || 0,
        sunrise: daily.sunrise[i],
        sunset: daily.sunset[i]
      });
    }

    // Visibility in km (hourly visibility is in meters)
    const visibilityKm = hourly.visibility && hourly.visibility[currentHourIndex]
      ? (hourly.visibility[currentHourIndex] / 1000).toFixed(1)
      : '10.0';

    const uvIndexNow = hourly.uv_index && hourly.uv_index[currentHourIndex] !== undefined
      ? hourly.uv_index[currentHourIndex]
      : (daily.uv_index_max[0] || 0);

    const weatherPayload = {
      current: {
        temperature: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        condition: condition.label,
        icon: condition.icon,
        weatherCode: current.weather_code,
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        windDirection: current.wind_direction_10m,
        pressure: Math.round(current.surface_pressure),
        visibility: visibilityKm,
        uvIndex: uvIndexNow,
        rainProbability: daily.precipitation_probability_max[0] || 0,
        highTemp: Math.round(daily.temperature_2m_max[0]),
        lowTemp: Math.round(daily.temperature_2m_min[0]),
        sunrise: daily.sunrise[0],
        sunset: daily.sunset[0]
      },
      hourly: next24Hours,
      daily: sevenDayForecast,
      timezone: data.timezone
    };

    res.json(weatherPayload);
  } catch (err) {
    console.error('[Weather Data Fetch Error]', err.message);
    res.status(500).json({ error: 'Failed to retrieve weather data.' });
  }
});

// 4. Log a weather check
router.post('/log-check', (req, res) => {
  const { anonymousUserId, location, temperature, condition } = req.body;

  if (!anonymousUserId || !location) {
    return res.status(400).json({ error: 'anonymousUserId and location are required.' });
  }

  try {
    // Ensure user exists in users table
    let user = db.prepare('SELECT id FROM users WHERE anonymous_user_id = ?').get(anonymousUserId);
    if (!user) {
      const info = db.prepare(`
        INSERT INTO users (anonymous_user_id, last_weather_check, location_sharing_enabled)
        VALUES (?, CURRENT_TIMESTAMP, 0)
      `).run(anonymousUserId);
      user = { id: info.lastInsertRowid };
    } else {
      db.prepare(`
        UPDATE users SET last_weather_check = CURRENT_TIMESTAMP WHERE id = ?
      `).run(user.id);
    }

    // Insert weather check
    db.prepare(`
      INSERT INTO weather_checks (user_id, location, temperature, weather_condition)
      VALUES (?, ?, ?, ?)
    `).run(user.id, location, temperature || null, condition || null);

    res.json({ success: true });
  } catch (err) {
    console.error('[Log Check Error]', err.message);
    res.status(500).json({ error: 'Failed to log weather check.' });
  }
});

module.exports = router;
