import React from 'react';
import { NavigationOff, MapPinOff, RefreshCw, Search } from 'lucide-react';

export default function PermissionStateView({
  permissionState, // 'gps-off' | 'denied'
  onTryAgain,
  onOpenManualSearch,
  isDetecting
}) {
  if (permissionState === 'gps-off') {
    return (
      <div className="status-banner banner-gps-off glass-panel" role="alert">
        <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '12px', borderRadius: '50%' }}>
          <NavigationOff size={32} color="#f59e0b" />
        </div>
        <div className="banner-title">Location Services Disabled</div>
        <p className="banner-desc">
          Your location is turned off. Please turn on Location/GPS to get accurate local weather.
        </p>
        <div className="banner-actions">
          <button 
            id="btn-try-again-gps"
            className="btn btn-primary" 
            onClick={onTryAgain}
            disabled={isDetecting}
          >
            <RefreshCw size={16} className={isDetecting ? 'spinner' : ''} />
            {isDetecting ? 'Detecting Location...' : 'Try Again'}
          </button>
          <button 
            id="btn-search-manual-gps"
            className="btn btn-secondary" 
            onClick={onOpenManualSearch}
          >
            <Search size={16} />
            Search City Manually
          </button>
        </div>
      </div>
    );
  }

  if (permissionState === 'denied') {
    return (
      <div className="status-banner banner-denied glass-panel" role="alert">
        <div style={{ background: 'rgba(244, 63, 94, 0.2)', padding: '12px', borderRadius: '50%' }}>
          <MapPinOff size={32} color="#f43f5e" />
        </div>
        <div className="banner-title">Location Permission Required</div>
        <p className="banner-desc">
          Location permission is required for automatic local weather. Please enable location permissions in your browser settings to continue, or search for your city directly.
        </p>
        <div className="banner-actions">
          <button 
            id="btn-allow-location"
            className="btn btn-primary" 
            onClick={onTryAgain}
            disabled={isDetecting}
          >
            <RefreshCw size={16} className={isDetecting ? 'spinner' : ''} />
            {isDetecting ? 'Checking Permission...' : 'Allow Location'}
          </button>
          <button 
            id="btn-search-manual-denied"
            className="btn btn-secondary" 
            onClick={onOpenManualSearch}
          >
            <Search size={16} />
            Search City Manually
          </button>
        </div>
      </div>
    );
  }

  return null;
}
