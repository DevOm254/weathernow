import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';
import { API_BASE } from '../config';

export default function SearchBar({ onSelectCity }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_BASE}/api/weather/search-city?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.results || []);
        setIsOpen(true);
      } catch (err) {
        console.error('City search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item) => {
    setQuery('');
    setIsOpen(false);
    onSelectCity({
      city: item.name,
      district: item.state,
      state: item.state,
      country: item.country,
      latitude: item.latitude,
      longitude: item.longitude
    });
  };

  const popularCities = [
    { name: 'Tokyo', lat: 35.6895, lon: 139.6917, country: 'Japan' },
    { name: 'London', lat: 51.5074, lon: -0.1278, country: 'United Kingdom' },
    { name: 'New York', lat: 40.7128, lon: -74.006, country: 'United States' },
    { name: 'Mumbai', lat: 19.076, lon: 72.8777, country: 'India' },
    { name: 'Paris', lat: 48.8566, lon: 2.3522, country: 'France' }
  ];

  return (
    <div className="search-wrapper" ref={wrapperRef}>
      <div className="search-input-box">
        <Search size={18} color="var(--text-muted)" />
        <input
          id="city-search-input"
          type="text"
          className="search-input"
          placeholder="Search city, district, or region..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
        />
        {isSearching && <Loader2 size={16} className="spinner" />}
        {query && !isSearching && (
          <button
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            onClick={() => setQuery('')}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="search-dropdown" id="search-results-dropdown">
          {results.map((item) => (
            <div
              key={item.id}
              className="search-item"
              onClick={() => handleSelect(item)}
            >
              <div>
                <div className="search-item-name">{item.name}</div>
                <div className="search-item-region">
                  {[item.state, item.country].filter(Boolean).join(', ')}
                </div>
              </div>
              <MapPin size={16} color="var(--text-muted)" />
            </div>
          ))}
        </div>
      )}

      {/* Quick popular pills */}
      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginTop: '0.6rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Popular:</span>
        {popularCities.map((c) => (
          <button
            key={c.name}
            className="btn btn-secondary"
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: '9999px' }}
            onClick={() =>
              onSelectCity({
                city: c.name,
                country: c.country,
                latitude: c.lat,
                longitude: c.lon
              })
            }
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
