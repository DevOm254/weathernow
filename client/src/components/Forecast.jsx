import React from 'react';
import { Clock, Calendar, Droplets } from 'lucide-react';
import WeatherIcon from './WeatherIcon';

export default function Forecast({ hourly = [], daily = [] }) {
  // Format hour string (e.g., '14:00')
  const formatHour = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  // Format day name (e.g., 'Today', 'Mon', 'Tue')
  const formatDay = (dateString, index) => {
    if (index === 0) return 'Today';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString([], { weekday: 'short' });
    } catch {
      return dateString;
    }
  };

  // Calculate overall min/max for daily bar scaling
  const allMins = daily.map(d => d.minTemp);
  const allMaxs = daily.map(d => d.maxTemp);
  const minTempAll = Math.min(...(allMins.length ? allMins : [0]));
  const maxTempAll = Math.max(...(allMaxs.length ? allMaxs : [35]));
  const range = maxTempAll - minTempAll || 1;

  return (
    <div>
      {/* 24-Hour Forecast */}
      <div className="forecast-section">
        <h2 className="section-title">
          <Clock size={18} color="var(--accent-cyan)" />
          Hourly Forecast (Next 24 Hours)
        </h2>
        <div className="hourly-scroll" id="hourly-forecast-list">
          {hourly.map((item, idx) => (
            <div key={idx} className="hourly-card">
              <span className="hourly-time">{formatHour(item.time)}</span>
              <div style={{ color: 'var(--accent-amber)' }}>
                <WeatherIcon name={item.icon} size={24} />
              </div>
              <span className="hourly-temp">{item.temperature}°</span>
              <div className="hourly-rain">
                <Droplets size={10} />
                <span>{item.rainProbability}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7-Day Forecast */}
      <div className="forecast-section">
        <h2 className="section-title">
          <Calendar size={18} color="var(--primary)" />
          7-Day Forecast
        </h2>
        <div className="daily-list" id="daily-forecast-list">
          {daily.map((item, idx) => {
            const leftPercent = ((item.minTemp - minTempAll) / range) * 100;
            const widthPercent = Math.max(15, ((item.maxTemp - item.minTemp) / range) * 100);

            return (
              <div key={idx} className="daily-row">
                <span className="daily-day">{formatDay(item.date, idx)}</span>
                <div className="daily-condition">
                  <div style={{ color: 'var(--accent-amber)' }}>
                    <WeatherIcon name={item.icon} size={20} />
                  </div>
                  <span>{item.condition}</span>
                </div>
                <div className="daily-temp-bar-container">
                  <span className="temp-min">{item.minTemp}°</span>
                  <div className="temp-bar">
                    <div
                      className="temp-bar-fill"
                      style={{
                        marginLeft: `${Math.max(0, leftPercent)}%`,
                        width: `${Math.min(100 - leftPercent, widthPercent)}%`
                      }}
                    />
                  </div>
                  <span className="temp-max">{item.maxTemp}°</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
