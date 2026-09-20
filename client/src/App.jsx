import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CloudSun,
  Shield,
  MapPin,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Compass
} from 'lucide-react';
import SearchBar from './components/SearchBar';
import WeatherCard from './components/WeatherCard';
import WeatherDetails from './components/WeatherDetails';
import Forecast from './components/Forecast';
import PermissionStateView from './components/PermissionStateView';
import LocationSharingModal from './components/LocationSharingModal';
import AdminDashboard from './pages/AdminDashboard';
import { getAnonymousUserId } from './utils/anonymousUser';
import { API_BASE } from './config';

export default function App() {
  // Navigation / View state
  const [currentView, setCurrentView] = useState(() => {
    return window.location.pathname.startsWith('/admin') || window.location.hash === '#admin'
      ? 'admin'
      : 'weather';
  });

  // Anonymous User Identification
  const [anonymousUserId] = useState(() => getAnonymousUserId());

  // Location & Geolocation Permission States:
  // 'idle' | 'detecting' | 'gps-off' | 'denied' | 'success'
  const [locationStatus, setLocationStatus] = useState('idle');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isManualSearchOpen, setIsManualSearchOpen] = useState(false);

  // Weather & Coordinates Data
  const [locationInfo, setLocationInfo] = useState({
    city: 'Detecting Location...',
    district: '',
    state: '',
    country: '',
    latitude: null,
    longitude: null
  });
  const [weatherData, setWeatherData] = useState(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  // Privacy: Share Location with WeatherNow (OFF by default)
  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);
  const [isSharingEnabled, setIsSharingEnabled] = useState(false);
  const [lastLocationUpdateTime, setLastLocationUpdateTime] = useState(null);
  const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);

  // Periodic location updater ref
  const watchIdRef = useRef(null);

  // Handle URL changes & popstate
  useEffect(() => {
    const handleLocationChange = () => {
      if (window.location.pathname.startsWith('/admin') || window.location.hash === '#admin') {
        setCurrentView('admin');
      } else {
        setCurrentView('weather');
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Fetch initial location sharing status from server for this anonymous user
  useEffect(() => {
    async function checkConsentStatus() {
      try {
        const res = await fetch(`${API_BASE}/api/location/status/${anonymousUserId}`);
        const data = await res.json();
        setIsSharingEnabled(Boolean(data.enabled));
        setLastLocationUpdateTime(data.lastUpdate);
      } catch (err) {
        console.error('Failed to fetch consent status:', err);
      }
    }
    checkConsentStatus();
  }, [anonymousUserId]);

  // Reverse geocode and fetch weather
  const fetchWeatherForCoords = useCallback(async (lat, lon, customName = null) => {
    setIsLoadingWeather(true);
    try {
      // 1. Reverse Geocode if customName not provided
      let locData = customName;
      if (!locData) {
        const geoRes = await fetch(`${API_BASE}/api/weather/reverse-geocode?lat=${lat}&lon=${lon}`);
        locData = await geoRes.json();
      }

      setLocationInfo({
        city: locData.city || 'Unknown Location',
        district: locData.district || '',
        state: locData.state || '',
        country: locData.country || '',
        latitude: lat,
        longitude: lon
      });

      // 2. Fetch full weather data
      const weatherRes = await fetch(`${API_BASE}/api/weather/data?lat=${lat}&lon=${lon}`);
      const weatherJson = await weatherRes.json();
      setWeatherData(weatherJson);
      setLocationStatus('success');

      // 3. Log check in backend database
      fetch(`${API_BASE}/api/weather/log-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anonymousUserId,
          location: `${locData.city || 'Coordinates'}${locData.country ? ', ' + locData.country : ''}`,
          temperature: weatherJson.current?.temperature,
          condition: weatherJson.current?.condition
        })
      }).catch((e) => console.warn('Could not log weather check:', e));

    } catch (err) {
      console.error('Weather fetch error:', err);
    } finally {
      setIsLoadingWeather(false);
      setIsDetecting(false);
    }
  }, [anonymousUserId]);

  // Request browser location using Geolocation API
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      return;
    }

    setIsDetecting(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        fetchWeatherForCoords(latitude, longitude);

        // If user has explicitly enabled location sharing, transmit update
        if (isSharingEnabled) {
          transmitLocationUpdate(latitude, longitude, accuracy);
        }
      },
      (error) => {
        setIsDetecting(false);
        // Error code 1 = PERMISSION_DENIED
        // Error code 2 = POSITION_UNAVAILABLE (GPS Off)
        // Error code 3 = TIMEOUT
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus('denied');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationStatus('gps-off');
        } else {
          // Timeout or general failure -> treat as GPS off / unavailable
          setLocationStatus('gps-off');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [fetchWeatherForCoords, isSharingEnabled]);

  // Auto-detect on first page load
  useEffect(() => {
    requestLocation();
  }, []);

  // Transmit location update (STRICTLY ONLY WHEN isSharingEnabled === true)
  const transmitLocationUpdate = async (lat, lon, accuracy) => {
    if (!isSharingEnabled) return;

    try {
      const res = await fetch(`${API_BASE}/api/location/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anonymousUserId,
          latitude: lat,
          longitude: lon,
          accuracy,
          city: locationInfo.city,
          state: locationInfo.state
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLastLocationUpdateTime(data.timestamp);
      }
    } catch (err) {
      console.error('Failed to submit consenting location update:', err);
    }
  };

  // Continuous background location watcher ONLY IF sharing enabled
  useEffect(() => {
    if (isSharingEnabled && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          transmitLocationUpdate(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        },
        (err) => console.warn('Watch position issue:', err),
        { enableHighAccuracy: true, maximumAge: 30000 }
      );
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isSharingEnabled, locationInfo.city, locationInfo.state]);

  // Enable Location Sharing
  const handleEnableSharing = async () => {
    setIsUpdatingConsent(true);
    try {
      const res = await fetch(`${API_BASE}/api/location/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonymousUserId, enabled: true })
      });
      if (res.ok) {
        setIsSharingEnabled(true);
        // Prompt for current position immediately to sync
        if (locationInfo.latitude && locationInfo.longitude) {
          transmitLocationUpdate(locationInfo.latitude, locationInfo.longitude, 50);
        } else {
          requestLocation();
        }
      }
    } catch (err) {
      console.error('Enable sharing failed:', err);
    } finally {
      setIsUpdatingConsent(false);
    }
  };

  // Stop Location Sharing (Immediately stops transmissions)
  const handleStopSharing = async () => {
    setIsUpdatingConsent(true);
    // Clear active browser watcher immediately
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    try {
      const res = await fetch(`${API_BASE}/api/location/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonymousUserId, enabled: false })
      });
      if (res.ok) {
        setIsSharingEnabled(false);
      }
    } catch (err) {
      console.error('Stop sharing failed:', err);
    } finally {
      setIsUpdatingConsent(false);
    }
  };

  // Handle City Selected from Search
  const handleSelectCity = (cityData) => {
    setIsManualSearchOpen(false);
    setLocationStatus('success');
    fetchWeatherForCoords(cityData.latitude, cityData.longitude, cityData);
  };

  // Switch to Admin view
  const navigateToAdmin = () => {
    window.location.hash = '#admin';
    setCurrentView('admin');
  };

  // Switch to Weather view
  const navigateToHome = () => {
    window.location.hash = '';
    window.history.pushState({}, '', '/');
    setCurrentView('weather');
  };

  // Render Admin View if on `/admin`
  if (currentView === 'admin') {
    return <AdminDashboard onNavigateHome={navigateToHome} />;
  }

  // Render User Weather View
  return (
    <div>
      {/* App Header */}
      <header className="app-header">
        <div className="brand-container" onClick={navigateToHome}>
          <div className="brand-icon-wrapper">
            <CloudSun size={24} />
          </div>
          <span className="brand-title">WeatherNow</span>
        </div>

        <div className="header-actions">
          {/* Refresh Location Button */}
          <button
            id="btn-refresh-location"
            className="btn btn-secondary"
            style={{ padding: '0.5rem 0.8rem' }}
            onClick={requestLocation}
            title="Auto-Detect Current GPS Location"
          >
            <Compass size={16} className={isDetecting ? 'spinner' : ''} />
            <span style={{ display: 'none', md: 'inline' }}>Auto Detect</span>
          </button>

          {/* Privacy & Location Sharing Trigger Button */}
          <button
            id="btn-privacy-settings"
            className={`btn ${isSharingEnabled ? 'btn-success' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 0.9rem' }}
            onClick={() => setIsSharingModalOpen(true)}
          >
            <Shield size={16} />
            <span>{isSharingEnabled ? 'Sharing: ON' : 'Location Privacy'}</span>
          </button>

          {/* Portal Link */}
          <button
            id="btn-nav-admin"
            className="btn btn-primary"
            style={{ padding: '0.5rem 0.9rem' }}
            onClick={navigateToAdmin}
          >
            Admin Portal
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-container">
        {/* City Search Bar */}
        <SearchBar onSelectCity={handleSelectCity} />

        {/* Location Permission Fallback Banners (GPS Off / Denied) */}
        {(locationStatus === 'gps-off' || locationStatus === 'denied') && (
          <PermissionStateView
            permissionState={locationStatus}
            onTryAgain={requestLocation}
            onOpenManualSearch={() => {
              const input = document.getElementById('city-search-input');
              if (input) {
                input.focus();
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            isDetecting={isDetecting}
          />
        )}

        {/* Privacy Status Card */}
        <div className="privacy-bar">
          <div className="privacy-info">
            <span className={`privacy-status-dot ${isSharingEnabled ? 'active' : ''}`}></span>
            <div>
              <div className="privacy-text-main">
                {isSharingEnabled
                  ? 'Location Sharing with WeatherNow is Active'
                  : 'Location Sharing with WeatherNow is Disabled (Default)'}
              </div>
              <div className="privacy-text-sub">
                {isSharingEnabled
                  ? `Last update: ${lastLocationUpdateTime ? new Date(lastLocationUpdateTime).toLocaleTimeString() : 'Just now'}`
                  : 'Your location telemetry is never stored or displayed to administrators.'}
              </div>
            </div>
          </div>

          <button
            id="btn-manage-privacy"
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            onClick={() => setIsSharingModalOpen(true)}
          >
            Configure Privacy
          </button>
        </div>

        {/* Loading Spinner */}
        {isLoadingWeather && !weatherData && (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div className="spinner" style={{ margin: '0 auto 1.5rem', width: '42px', height: '42px' }}></div>
            <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
              Fetching real-time meteorological conditions...
            </p>
          </div>
        )}

        {/* Weather Dashboard */}
        {weatherData && (
          <>
            {/* Hero Weather Card */}
            <WeatherCard weather={weatherData} locationInfo={locationInfo} />

            {/* Weather Metrics Grid */}
            <WeatherDetails weather={weatherData} />

            {/* Hourly & 7-Day Forecast */}
            <Forecast hourly={weatherData.hourly} daily={weatherData.daily} />
          </>
        )}
      </main>

      {/* Location Privacy Modal */}
      <LocationSharingModal
        isOpen={isSharingModalOpen}
        onClose={() => setIsSharingModalOpen(false)}
        isSharingEnabled={isSharingEnabled}
        lastUpdateTime={lastLocationUpdateTime}
        onEnableSharing={handleEnableSharing}
        onStopSharing={handleStopSharing}
        currentLocationInfo={locationInfo}
        isLoading={isUpdatingConsent}
      />
    </div>
  );
}
