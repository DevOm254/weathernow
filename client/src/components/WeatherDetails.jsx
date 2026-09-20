import React from 'react';
import { Droplets, Wind, Gauge, Eye, Sun, CloudRain } from 'lucide-react';

export default function WeatherDetails({ weather }) {
  if (!weather || !weather.current) return null;

  const { current } = weather;

  // UV index category
  const getUvLevel = (val) => {
    if (val <= 2) return { text: 'Low', color: '#34d399' };
    if (val <= 5) return { text: 'Moderate', color: '#fbbf24' };
    if (val <= 7) return { text: 'High', color: '#fb923c' };
    if (val <= 10) return { text: 'Very High', color: '#f87171' };
    return { text: 'Extreme', color: '#c084fc' };
  };

  const uvLevel = getUvLevel(current.uvIndex);

  const metrics = [
    {
      id: 'humidity',
      label: 'Humidity',
      icon: <Droplets size={18} color="#06b6d4" />,
      value: `${current.humidity}%`,
      sub: current.humidity > 60 ? 'Humid air' : 'Comfortable'
    },
    {
      id: 'wind',
      label: 'Wind Speed',
      icon: <Wind size={18} color="#818cf8" />,
      value: `${current.windSpeed} km/h`,
      sub: `Direction: ${current.windDirection}°`
    },
    {
      id: 'rain-prob',
      label: 'Rain Probability',
      icon: <CloudRain size={18} color="#38bdf8" />,
      value: `${current.rainProbability}%`,
      sub: current.rainProbability > 50 ? 'Rain expected' : 'Low chance'
    },
    {
      id: 'uv-index',
      label: 'UV Index',
      icon: <Sun size={18} color="#f59e0b" />,
      value: `${current.uvIndex}`,
      sub: <span style={{ color: uvLevel.color, fontWeight: 600 }}>{uvLevel.text}</span>
    },
    {
      id: 'pressure',
      label: 'Pressure',
      icon: <Gauge size={18} color="#a78bfa" />,
      value: `${current.pressure} hPa`,
      sub: current.pressure >= 1013 ? 'High pressure' : 'Normal / Low'
    },
    {
      id: 'visibility',
      label: 'Visibility',
      icon: <Eye size={18} color="#10b981" />,
      value: `${current.visibility} km`,
      sub: parseFloat(current.visibility) >= 10 ? 'Clear view' : 'Reduced'
    }
  ];

  return (
    <div className="highlights-grid">
      {metrics.map((item) => (
        <div key={item.id} className="metric-card glass-panel" id={`metric-${item.id}`}>
          <div className="metric-top">
            {item.icon}
            <span>{item.label}</span>
          </div>
          <div className="metric-val">{item.value}</div>
          <div className="metric-sub">{item.sub}</div>
        </div>
      ))}
    </div>
  );
}
