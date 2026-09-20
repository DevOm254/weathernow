import React from 'react';
import {
  Sun,
  SunDim,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudHail,
  CloudSnow,
  CloudLightning
} from 'lucide-react';

export default function WeatherIcon({ name, size = 32, className = '' }) {
  switch (name) {
    case 'Sun':
      return <Sun size={size} className={className} />;
    case 'SunDim':
      return <SunDim size={size} className={className} />;
    case 'CloudSun':
      return <CloudSun size={size} className={className} />;
    case 'Cloud':
      return <Cloud size={size} className={className} />;
    case 'CloudFog':
      return <CloudFog size={size} className={className} />;
    case 'CloudDrizzle':
      return <CloudDrizzle size={size} className={className} />;
    case 'CloudRain':
      return <CloudRain size={size} className={className} />;
    case 'CloudHail':
      return <CloudHail size={size} className={className} />;
    case 'CloudSnow':
      return <CloudSnow size={size} className={className} />;
    case 'CloudLightning':
      return <CloudLightning size={size} className={className} />;
    default:
      return <CloudSun size={size} className={className} />;
  }
}
