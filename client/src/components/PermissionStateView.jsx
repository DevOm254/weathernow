import React from 'react';
import { NavigationOff, MapPinOff, RefreshCw, Search } from 'lucide-react';

export default function PermissionStateView({
  permissionState, // 'gps-off' | 'denied'
  onTryAgain,
  onOpenManualSearch,
  isDetecting,
  hasWeather = false
}) {
  if (hasWeather) {
    return (
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.8rem',
          padding: '0.75rem 1.25rem',
          marginBottom: '1rem',
          borderRadius: '12px',
          borderLeft: permissionState === 'denied' ? '4px solid #f43f5e' : '4px solid #f59e0b',
          background: 'rgba(15, 23, 42, 0.75)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {permissionState === 'denied' ? (
            <MapPinOff size={20} color="#f43f5e" />
          ) : (
            <NavigationOff size={20} color="#f59e0b" />
          )}
          <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            Showing weather using <strong>network location</strong>. Turn on GPS/Location permission for exact live street precision.
          </span>
        </div>
        <button
          className="btn btn-primary"
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
          onClick={onTryAgain}
          disabled={isDetecting}
        >
          <RefreshCw size={14} className={isDetecting ? 'spinner' : ''} />
          {isDetecting ? 'Detecting GPS...' : 'Enable Exact GPS'}
        </button>
      </div>
    );
  }

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
