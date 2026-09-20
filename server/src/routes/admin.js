const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateAdmin, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// 1. Admin Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email.toLowerCase().trim());
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const match = bcrypt.compareSync(password, admin.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Record audit log
    db.prepare(`
      INSERT INTO audit_logs (action, admin_email, details, ip_address)
      VALUES (?, ?, ?, ?)
    `).run('ADMIN_LOGIN', admin.email, 'Admin successfully logged in', req.ip);

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('[Admin Login Error]', err.message);
    res.status(500).json({ error: 'Login failed due to a server error.' });
  }
});

// All subsequent routes require admin authentication
router.use(authenticateAdmin);

// 2. Current Admin Profile
router.get('/me', (req, res) => {
  res.json({ admin: req.admin });
});

// 3. Analytics & Statistics
router.get('/stats', (req, res) => {
  try {
    // Total users
    const totalUsersRow = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const totalUsers = totalUsersRow ? totalUsersRow.count : 0;

    // Location-sharing consenting users
    const sharingUsersRow = db.prepare('SELECT COUNT(*) as count FROM users WHERE location_sharing_enabled = 1').get();
    const sharingUsers = sharingUsersRow ? sharingUsersRow.count : 0;

    // Total weather checks
    const weatherChecksRow = db.prepare('SELECT COUNT(*) as count FROM weather_checks').get();
    const totalWeatherChecks = weatherChecksRow ? weatherChecksRow.count : 0;

    // City-wise searches (top 10)
    const citySearches = db.prepare(`
      SELECT location as city, COUNT(*) as count 
      FROM weather_checks 
      GROUP BY location 
      ORDER BY count DESC 
      LIMIT 10
    `).all();

    // Last active time across system
    const lastWeatherRow = db.prepare('SELECT MAX(timestamp) as lastCheck FROM weather_checks').get();
    const lastLocationRow = db.prepare('SELECT MAX(timestamp) as lastLoc FROM location_updates').get();

    const lastActiveTime = lastLocationRow?.lastLoc && lastWeatherRow?.lastCheck
      ? (new Date(lastLocationRow.lastLoc) > new Date(lastWeatherRow.lastCheck) ? lastLocationRow.lastLoc : lastWeatherRow.lastCheck)
      : (lastWeatherRow?.lastCheck || lastLocationRow?.lastLoc || null);

    res.json({
      activeUsers: totalUsers,
      locationSharingUsers: sharingUsers,
      totalWeatherChecks,
      citySearches,
      lastActiveTime
    });
  } catch (err) {
    console.error('[Admin Stats Error]', err.message);
    res.status(500).json({ error: 'Failed to retrieve stats.' });
  }
});

// 4. Consenting Users (STRICT PRIVACY: ONLY WHERE location_sharing_enabled = 1)
router.get('/consenting-users', (req, res) => {
  const { search } = req.query;

  try {
    // Select consenting users and their most recent location update
    const users = db.prepare(`
      SELECT 
        u.id,
        u.anonymous_user_id,
        u.created_at,
        u.last_weather_check,
        u.location_sharing_enabled,
        loc.latitude,
        loc.longitude,
        loc.accuracy,
        loc.city,
        loc.state,
        loc.timestamp as last_location_update
      FROM users u
      LEFT JOIN location_updates loc ON loc.id = (
        SELECT id FROM location_updates 
        WHERE user_id = u.id 
        ORDER BY timestamp DESC 
        LIMIT 1
      )
      WHERE u.location_sharing_enabled = 1
      ORDER BY loc.timestamp DESC NULLS LAST, u.last_weather_check DESC NULLS LAST
    `).all();

    // Filter if search query provided
    let filtered = users;
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = users.filter(u => 
        (u.anonymous_user_id && u.anonymous_user_id.toLowerCase().includes(q)) ||
        (u.city && u.city.toLowerCase().includes(q)) ||
        (u.state && u.state.toLowerCase().includes(q))
      );
    }

    res.json({
      users: filtered.map(u => ({
        id: u.id,
        anonymousUserId: u.anonymous_user_id,
        city: u.city || 'Detecting...',
        state: u.state || '',
        lastWeatherCheck: u.last_weather_check,
        locationSharing: Boolean(u.location_sharing_enabled),
        lastUpdate: u.last_location_update || u.last_weather_check,
        latitude: u.latitude,
        longitude: u.longitude,
        accuracy: u.accuracy
      }))
    });
  } catch (err) {
    console.error('[Admin Consenting Users Error]', err.message);
    res.status(500).json({ error: 'Failed to fetch consenting users.' });
  }
});

// 5. Audit Logs
router.get('/audit-logs', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT * FROM audit_logs 
      ORDER BY timestamp DESC 
      LIMIT 50
    `).all();
    res.json({ logs });
  } catch (err) {
    console.error('[Audit Logs Error]', err.message);
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

module.exports = router;
