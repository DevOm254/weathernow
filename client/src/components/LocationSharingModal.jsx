import React from 'react';
import { ShieldCheck, ShieldAlert, X, Radio, Clock, MapPin } from 'lucide-react';

export default function LocationSharingModal({
  isOpen,
  onClose,
  isSharingEnabled,
  lastUpdateTime,
  onEnableSharing,
  onStopSharing,
  currentLocationInfo,
  isLoading
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{
            background: isSharingEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
            padding: '10px',
            borderRadius: '12px'
          }}>
            {isSharingEnabled ? (
              <ShieldCheck size={26} color="#10b981" />
            ) : (
              <ShieldAlert size={26} color="#6366f1" />
            )}
          </div>
          <div>
            <h2 className="modal-title">Share Location with WeatherNow</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
              <span className={`privacy-status-dot ${isSharingEnabled ? 'active' : ''}`}></span>
              <span style={{ fontSize: '0.82rem', color: isSharingEnabled ? '#34d399' : 'var(--text-muted)' }}>
                {isSharingEnabled ? 'Location Sharing is ACTIVE' : 'Location Sharing is OFF'}
              </span>
            </div>
          </div>
          <button
            id="btn-close-modal"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p>
            WeatherNow respects your privacy. By default, your location is <strong>never shared or stored</strong>.
          </p>

          <div className="modal-quote">
            “By enabling this feature, you allow authorized administrators to view your approximate current location while location sharing is active.”
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            You can revoke this permission at any moment. Once stopped, all real-time transmissions cease immediately.
          </p>

          {/* Sharing status metadata box */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            border: '1px solid var(--border-glass)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                <Radio size={14} color={isSharingEnabled ? '#10b981' : '#64748b'} />
                Status
              </span>
              <span className={`badge ${isSharingEnabled ? 'badge-success' : 'badge-danger'}`}>
                {isSharingEnabled ? 'Active' : 'Off'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                <Clock size={14} />
                Last Update
              </span>
              <span style={{ color: '#fff', fontWeight: 500 }}>
                {lastUpdateTime ? new Date(lastUpdateTime).toLocaleTimeString() : 'Never shared'}
              </span>
            </div>

            {currentLocationInfo && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                  <MapPin size={14} />
                  Approx. Location
                </span>
                <span style={{ color: '#cbd5e1' }}>
                  {currentLocationInfo.city || 'Detecting...'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          {isSharingEnabled ? (
            <button
              id="btn-stop-sharing"
              className="btn btn-danger"
              onClick={onStopSharing}
              disabled={isLoading}
              style={{ width: '100%' }}
            >
              <ShieldAlert size={16} />
              Stop Location Sharing
            </button>
          ) : (
            <button
              id="btn-enable-sharing"
              className="btn btn-success"
              onClick={onEnableSharing}
              disabled={isLoading}
              style={{ width: '100%' }}
            >
              <ShieldCheck size={16} />
              Enable Location Sharing
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
