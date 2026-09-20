import React from 'react';
import { MapPin, Sunrise, Sunset, ArrowUp, ArrowDown } from 'lucide-react';
import WeatherIcon from './WeatherIcon';

export default function WeatherCard({ weather, locationInfo }) {
  if (!weather || !weather.current) return null;

  const { current } = weather;

  // Format sunrise / sunset if in ISO string format
  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="hero-weather-card glass-panel" id="main-weather-card">
      <div className="location-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)' }}>
            <MapPin size={18} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Current Location
            </span>
          </div>
          <h1 className="location-city" id="weather-city-name">
            {locationInfo.city || 'Local Forecast'}
          </h1>
          <div className="location-region" id="weather-region-name">
            {[locationInfo.district, locationInfo.state, locationInfo.country].filter(Boolean).join(', ')}
          </div>
        </div>

        <div className="high-low-badge">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#f87171' }}>
            <ArrowUp size={14} /> {current.highTemp}°C
          </span>
          <span style={{ opacity: 0.3 }}>|</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#60a5fa' }}>
            <ArrowDown size={14} /> {current.lowTemp}°C
          </span>
        </div>
      </div>

      <div className="hero-main-info">
        <div className="temp-group">
          <span className="current-temp" id="current-temp-val">{current.temperature}</span>
          <span className="temp-unit">°C</span>
        </div>

        <div className="condition-group">
          <div className="condition-icon-box">
            <WeatherIcon name={current.icon} size={64} />
          </div>
          <div className="condition-title" id="current-condition-text">{current.condition}</div>
          <div className="feels-like-text">Feels like {current.feelsLike}°C</div>
        </div>
      </div>

      <div className="hero-footer-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sunrise size={18} color="#f59e0b" />
            <span>Sunrise: <strong>{formatTime(current.sunrise)}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sunset size={18} color="#ec4899" />
            <span>Sunset: <strong>{formatTime(current.sunset)}</strong></span>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
