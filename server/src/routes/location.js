const express = require('express');
const db = require('../db');

const router = express.Router();

// 1. Get location sharing status for user
router.get('/status/:anonymousUserId', (req, res) => {
  const { anonymousUserId } = req.params;

  try {
    const user = db.prepare(`
      SELECT id, location_sharing_enabled, last_weather_check 
      FROM users 
      WHERE anonymous_user_id = ?
    `).get(anonymousUserId);

    if (!user) {
      return res.json({
        enabled: false,
        lastUpdate: null
      });
    }

    const lastLocation = db.prepare(`
      SELECT timestamp, city, state 
      FROM location_updates 
      WHERE user_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `).get(user.id);

    res.json({
      enabled: Boolean(user.location_sharing_enabled),
      lastUpdate: lastLocation ? lastLocation.timestamp : null,
      city: lastLocation ? lastLocation.city : null,
      state: lastLocation ? lastLocation.state : null
    });
  } catch (err) {
    console.error('[Location Status Error]', err.message);
    res.status(500).json({ error: 'Failed to retrieve location sharing status.' });
  }
});

// 2. Set location sharing consent (Enable / Stop)
router.post('/consent', (req, res) => {
  const { anonymousUserId, enabled } = req.body;

  if (!anonymousUserId || typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'anonymousUserId and boolean enabled status are required.' });
  }

  try {
    // Find or create user
    let user = db.prepare('SELECT id FROM users WHERE anonymous_user_id = ?').get(anonymousUserId);
    if (!user) {
      const info = db.prepare(`
        INSERT INTO users (anonymous_user_id, location_sharing_enabled)
        VALUES (?, ?)
      `).run(anonymousUserId, enabled ? 1 : 0);
      user = { id: info.lastInsertRowid };
    } else {
      db.prepare(`
        UPDATE users 
        SET location_sharing_enabled = ? 
        WHERE id = ?
      `).run(enabled ? 1 : 0, user.id);
    }

    // If disabled, log audit event that sharing was halted
    if (!enabled) {
      db.prepare(`
        INSERT INTO audit_logs (action, details, ip_address)
        VALUES (?, ?, ?)
      `).run('LOCATION_SHARING_STOPPED', `User ${anonymousUserId} disabled location sharing`, req.ip);
    } else {
      db.prepare(`
        INSERT INTO audit_logs (action, details, ip_address)
        VALUES (?, ?, ?)
      `).run('LOCATION_SHARING_ENABLED', `User ${anonymousUserId} explicitly opted into location sharing`, req.ip);
    }

    res.json({
      success: true,
      enabled: enabled,
      message: enabled ? 'Location sharing enabled' : 'Location sharing stopped immediately'
    });
  } catch (err) {
    console.error('[Consent Update Error]', err.message);
    res.status(500).json({ error: 'Failed to update location sharing consent.' });
  }
});

// 3. Submit location update (ONLY allowed if user explicitly enabled sharing)
router.post('/update', (req, res) => {
  const { anonymousUserId, latitude, longitude, accuracy, city, state } = req.body;

  if (!anonymousUserId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'anonymousUserId, latitude, and longitude are required.' });
  }

  try {
    // CRITICAL PRIVACY CHECK: Verify user has active consent
    const user = db.prepare('SELECT id, location_sharing_enabled FROM users WHERE anonymous_user_id = ?').get(anonymousUserId);

    if (!user || user.location_sharing_enabled !== 1) {
      // Reject and do NOT store any location data
      return res.status(403).json({
        error: 'Location sharing is not enabled for this user. Update discarded to protect user privacy.'
      });
    }

    // User has explicitly enabled sharing: record location
    db.prepare(`
      INSERT INTO location_updates (user_id, latitude, longitude, accuracy, city, state)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user.id, latitude, longitude, accuracy || null, city || null, state || null);

    res.json({
      success: true,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Location Update Error]', err.message);
    res.status(500).json({ error: 'Failed to record location update.' });
  }
});

module.exports = router;
