import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  MapPin,
  Activity,
  Search,
  LogOut,
  Shield,
  ShieldCheck,
  Clock,
  Radio,
  BarChart3,
  FileText,
  Lock,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import L from 'leaflet';
import { API_BASE } from '../config';

export default function AdminDashboard({ onNavigateHome }) {
  // Authentication state
  const [token, setToken] = useState(() => localStorage.getItem('weathernow_admin_token') || '');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin Data State
  const [stats, setStats] = useState(null);
  const [consentingUsers, setConsentingUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'users' | 'analytics' | 'logs'
  const [isLoading, setIsLoading] = useState(false);

  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersLayer = useRef(null);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('weathernow_admin_token', data.token);
      setToken(data.token);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('weathernow_admin_token');
    setToken('');
  };

  // Fetch Dashboard Data
  const fetchDashboardData = async () => {
    if (!token) return;
    setIsLoading(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, usersRes, logsRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/stats`, { headers }),
        fetch(`${API_BASE}/api/admin/consenting-users?search=${encodeURIComponent(searchQuery)}`, { headers }),
        fetch(`${API_BASE}/api/admin/audit-logs`, { headers })
      ]);

      if (statsRes.status === 401 || usersRes.status === 401) {
        handleLogout();
        return;
      }

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      const logsData = await logsRes.json();

      setStats(statsData);
      setConsentingUsers(usersData.users || []);
      setAuditLogs(logsData.logs || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 15000); // Polling every 15s
      return () => clearInterval(interval);
    }
  }, [token, searchQuery]);

  // Leaflet Map Initialization & Marker Updates
  useEffect(() => {
    if (!token || activeTab !== 'map') return;

    const timer = setTimeout(() => {
      const mapContainer = document.getElementById('admin-leaflet-map');
      if (!mapContainer) return;

      if (!leafletMap.current) {
        const map = L.map('admin-leaflet-map', {
          center: [20, 0],
          zoom: 2,
          minZoom: 2,
          maxZoom: 18
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        markersLayer.current = L.layerGroup().addTo(map);
        leafletMap.current = map;
      }

      // Update markers
      if (markersLayer.current) {
        markersLayer.current.clearLayers();

        const customIcon = L.divIcon({
          className: 'custom-map-pin',
          html: `<div style="
            width: 16px; 
            height: 16px; 
            background: #06b6d4; 
            border: 3px solid #ffffff; 
            border-radius: 50%; 
            box-shadow: 0 0 12px #06b6d4;
          "></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const bounds = [];

        consentingUsers.forEach((user) => {
          if (user.latitude && user.longitude) {
            bounds.push([user.latitude, user.longitude]);

            const popupHtml = `
              <div style="font-family: inherit; min-width: 220px; padding: 4px;">
                <div style="font-weight: 700; color: #38bdf8; font-size: 14px; margin-bottom: 6px;">
                  ${user.anonymousUserId}
                </div>
                <div style="font-size: 12px; margin-bottom: 4px;">
                  <strong>Approx. Location:</strong> ${user.latitude.toFixed(4)}, ${user.longitude.toFixed(4)}
                </div>
                <div style="font-size: 12px; margin-bottom: 4px;">
                  <strong>City/State:</strong> ${user.city}${user.state ? ', ' + user.state : ''}
                </div>
                <div style="font-size: 12px; margin-bottom: 4px;">
                  <strong>Last Weather Check:</strong> ${user.lastWeatherCheck ? new Date(user.lastWeatherCheck).toLocaleString() : 'None'}
                </div>
                <div style="font-size: 12px; margin-bottom: 4px;">
                  <strong>Last Location Update:</strong> ${user.lastUpdate ? new Date(user.lastUpdate).toLocaleString() : 'None'}
                </div>
                <div style="font-size: 12px; margin-bottom: 4px;">
                  <strong>Location Accuracy:</strong> ${user.accuracy ? `${Math.round(user.accuracy)} meters` : 'Standard'}
                </div>
                <div style="font-size: 12px; margin-top: 6px;">
                  <span style="background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 2px 8px; border-radius: 9999px; font-weight: 600;">
                    Consenting & Active
                  </span>
                </div>
              </div>
            `;

            const marker = L.marker([user.latitude, user.longitude], { icon: customIcon })
              .bindPopup(popupHtml);

            markersLayer.current.addLayer(marker);
          }
        });

        if (bounds.length > 0 && leafletMap.current) {
          leafletMap.current.fitBounds(bounds, { maxZoom: 10, padding: [40, 40] });
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [consentingUsers, activeTab, token]);

  // Clean up map on unmount
  useEffect(() => {
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Format date helper
  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleString();
    } catch {
      return isoString;
    }
  };

  // 1. If not authenticated, render Login Screen
  if (!token) {
    return (
      <div className="main-container" style={{ maxWidth: '460px', marginTop: '3rem' }}>
        <button
          className="btn btn-secondary"
          onClick={onNavigateHome}
          style={{ marginBottom: '1.5rem' }}
        >
          <ArrowLeft size={16} /> Back to WeatherNow
        </button>

        <div className="glass-panel" style={{ padding: '2.5rem 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div className="brand-icon-wrapper" style={{ margin: '0 auto 1rem', width: '48px', height: '48px' }}>
              <Shield size={26} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800 }}>
              Admin Portal
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
              Secure administrative access for consenting user telemetry
            </p>
          </div>

          {loginError && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              borderRadius: '10px',
              padding: '0.8rem 1rem',
              color: '#fca5a5',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              marginBottom: '1.2rem'
            }}>
              <AlertCircle size={18} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
                Email Address
              </label>
              <div className="search-input-box" style={{ borderRadius: '12px' }}>
                <input
                  id="admin-email-input"
                  type="email"
                  className="search-input"
                  style={{ marginLeft: 0 }}
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.8rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
                Password
              </label>
              <div className="search-input-box" style={{ borderRadius: '12px' }}>
                <Lock size={16} color="var(--text-muted)" />
                <input
                  id="admin-password-input"
                  type="password"
                  className="search-input"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              id="btn-admin-login"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem' }}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? 'Authenticating...' : 'Sign In to Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Authenticated Admin Dashboard
  return (
    <div className="admin-container">
      {/* Admin Header */}
      <div className="admin-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={onNavigateHome} style={{ padding: '0.4rem 0.8rem' }}>
              <ArrowLeft size={16} /> User App
            </button>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800 }}>
              WeatherNow Admin
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
            Authorized location-sharing telemetry and system telemetry
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={fetchDashboardData} disabled={isLoading}>
            <Activity size={16} className={isLoading ? 'spinner' : ''} />
            Refresh
          </button>
          <button id="btn-admin-logout" className="btn btn-danger" onClick={handleLogout}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="admin-kpis">
        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="kpi-val">{stats?.activeUsers ?? 0}</div>
            <div className="kpi-label">Active Users</div>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="kpi-val" style={{ color: '#34d399' }}>{stats?.locationSharingUsers ?? 0}</div>
            <div className="kpi-label">Location-Sharing Users</div>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
            <Activity size={24} />
          </div>
          <div>
            <div className="kpi-val">{stats?.totalWeatherChecks ?? 0}</div>
            <div className="kpi-label">Weather Checks</div>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="kpi-val" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              {stats?.lastActiveTime ? new Date(stats.lastActiveTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
            </div>
            <div className="kpi-label">Last Activity Time</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
        <button
          id="tab-map"
          className={`btn ${activeTab === 'map' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('map')}
        >
          <MapPin size={16} /> Consenting Users Map ({consentingUsers.length})
        </button>
        <button
          id="tab-users"
          className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} /> Consenting Users Table
        </button>
        <button
          id="tab-analytics"
          className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={16} /> City Searches & Stats
        </button>
        <button
          id="tab-logs"
          className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('logs')}
        >
          <FileText size={16} /> Audit Logs
        </button>
      </div>

      {/* TAB 1: INTERACTIVE MAP */}
      {activeTab === 'map' && (
        <div className="map-container-card glass-panel">
          <div className="map-header">
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>
                Live Consenting User Locations
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Showing approximate coordinates for users who have explicitly enabled location sharing
              </p>
            </div>
            <div className="badge badge-success">
              <Radio size={12} className="privacy-status-dot active" />
              {consentingUsers.length} Users Consenting
            </div>
          </div>
          <div id="admin-leaflet-map" style={{ width: '100%', height: '520px' }}></div>
        </div>
      )}

      {/* TAB 2: CONSENTING USERS TABLE */}
      {activeTab === 'users' && (
        <div className="table-card glass-panel">
          <div className="table-header-bar">
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>
                Consenting Users Directory
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Exclusively displaying users with explicit consent active
              </p>
            </div>

            {/* Filter / Search input */}
            <div className="search-input-box" style={{ maxWidth: '320px' }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                id="admin-search-users-input"
                type="text"
                className="search-input"
                placeholder="Search by ID, city, or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table" id="consenting-users-table">
              <thead>
                <tr>
                  <th>Anonymous User ID</th>
                  <th>City</th>
                  <th>Last Weather Check</th>
                  <th>Location Sharing</th>
                  <th>Last Update</th>
                </tr>
              </thead>
              <tbody>
                {consentingUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No consenting users found currently. Users appear here when they explicitly opt in.
                    </td>
                  </tr>
                ) : (
                  consentingUsers.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600, color: '#38bdf8' }}>
                        <code>{u.anonymousUserId}</code>
                      </td>
                      <td>{u.city}{u.state ? `, ${u.state}` : ''}</td>
                      <td>{formatDate(u.lastWeatherCheck)}</td>
                      <td>
                        <span className="badge badge-success">
                          Active
                        </span>
                      </td>
                      <td>{formatDate(u.lastUpdate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CITY SEARCHES & ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.2rem' }}>
            City-Wise Weather Searches
          </h2>
          {stats?.citySearches?.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No search records yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {stats?.citySearches?.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      background: 'rgba(99, 102, 241, 0.2)',
                      color: '#818cf8',
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.8rem'
                    }}>
                      #{idx + 1}
                    </div>
                    <span style={{ fontWeight: 600 }}>{item.city}</span>
                  </div>
                  <span className="badge badge-warning" style={{ fontSize: '0.85rem' }}>
                    {item.count} {item.count === 1 ? 'check' : 'checks'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="table-card glass-panel">
          <div className="table-header-bar">
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>
                Security & Privacy Audit Logs
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Immutable event stream for consent changes, logins, and permission revocations
              </p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table" id="audit-logs-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Admin / Subject</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{formatDate(log.timestamp)}</td>
                      <td>
                        <span className={`badge ${
                          log.action.includes('STOP') ? 'badge-danger' : log.action.includes('ENABLE') ? 'badge-success' : 'badge-warning'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td>{log.admin_email || 'User Event'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{log.details}</td>
                      <td><code>{log.ip_address || '—'}</code></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
