# WeatherNow 🌤️

WeatherNow is a modern, mobile-first weather web application built with a responsive glassmorphic frontend, browser Geolocation API workflows, strict user location sharing privacy controls, and a secure administrative portal featuring an interactive Leaflet map and live analytics.

---

## 🌟 Key Features

### 1. User Weather Application
- **Geolocation Permission Workflows**:
  - Automatically requests user location via `navigator.geolocation`.
  - **GPS Off**: Clear notification explaining that location is turned off with a **“Try Again”** button that re-detects when enabled.
  - **Permission Denied**: Educational prompt with **“Allow Location”** and **“Search City Manually”** options.
- **Reverse Geocoding**: Automatically resolves coordinates to city, district/state, and country.
- **Comprehensive Meteorological Data**:
  - Current temperature & feels-like temperature (°C)
  - Weather condition and dynamic animated WMO weather icons
  - Humidity (%)
  - Wind speed (km/h) & direction
  - Pressure (hPa)
  - Visibility (km)
  - UV index with risk tier badges
  - Sunrise & sunset times
  - Rain probability (%)
  - Today's high and low temperatures
  - 24-hour hourly forecast carousel
  - 7-day extended outlook with temperature progress bars
- **City Search Autocomplete**: Search any city or district worldwide or click popular quick-access city pills.

---

### 2. Location Privacy Controls
- **“Share Location with WeatherNow”**:
  - **OFF by default** to preserve absolute user privacy.
  - Transparent consent disclosure:
    > *“By enabling this feature, you allow authorized administrators to view your approximate current location while location sharing is active.”*
  - **Enable Location Sharing** / **Stop Location Sharing** controls.
  - Live status indicator (Active / Off) and timestamp of last location update.
  - **Zero Transmission Guarantee**: The backend actively rejects and discards any location telemetry if consent is not active. Disabling immediately halts all browser tracking.

---

### 3. Secure Admin Portal (`/admin`)
- **Authentication**: JWT-based authentication with bcrypt password hashing and rate limiting.
  - Default credentials: `admin@weathernow.local` / `AdminPass@123`
- **Consenting Users Map**: Interactive Leaflet + OpenStreetMap displaying markers exclusively for users who have opted into location sharing.
  - Clicking a marker displays: Anonymous User ID, Approximate coordinates, City/State, Last weather check, Last location update, Location accuracy, and Sharing status.
- **Consenting Users Directory**: Searchable and filterable table displaying:
  `| Anonymous User ID | City | Last Weather Check | Location Sharing | Last Update |`
- **Analytics & KPIs**:
  - Active users
  - Location-sharing users count
  - Total weather checks
  - Last activity timestamp
  - City-wise weather search rankings
- **Security & Privacy Audit Logs**: Immutable chronological record of logins, consent activations, and consent revocations.

---

## 🏗️ Architecture & Database Schema

### Tech Stack
- **Frontend**: React, Vite, Lucide React, Leaflet, Custom Mobile-First CSS design system.
- **Backend**: Node.js, Express, Helmet, CORS, express-rate-limit, bcryptjs, jsonwebtoken.
- **Database**: SQLite (via `better-sqlite3`), zero-configuration, WAL mode enabled.
- **APIs**: Open-Meteo API (weather, hourly, 7-day, geocoding), OpenStreetMap Nominatim (reverse geocoding).

### Database Tables
- **`users`**: `id`, `anonymous_user_id`, `created_at`, `last_weather_check`, `location_sharing_enabled`.
- **`location_updates`**: `id`, `user_id`, `latitude`, `longitude`, `accuracy`, `city`, `state`, `timestamp`.
- **`weather_checks`**: `id`, `user_id`, `location`, `temperature`, `weather_condition`, `timestamp`.
- **`admins`**: `id`, `email`, `password_hash`, `role`, `created_at`.
- **`audit_logs`**: `id`, `action`, `admin_email`, `details`, `ip_address`, `timestamp`.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+) & npm
- Python 3.10+ (standard installation, no extra pip packages required)

### 2. Run Entire Project with a Single Command (Recommended)
From the root directory, simply run:
```bash
py main.py
# or
python main.py
```
> **Tip for Windows:** You can also simply double-click [`start.bat`](file:///c:/Users/omraj/OneDrive/Desktop/weather%20fix/start.bat) or [`main.py`](file:///c:/Users/omraj/OneDrive/Desktop/weather%20fix/main.py) directly from File Explorer!

This orchestrator automatically:
- Checks environment and installs missing npm dependencies for both frontend and backend.
- Starts backend API server on `http://localhost:5000`.
- Starts Vite React frontend on `http://localhost:3000`.
- Automatically opens `http://localhost:3000` in your default browser.
- Displays live, color-coded unified logs (`[BACKEND]` and `[FRONTEND]`).
- Cleanly terminates both background servers when you press `Ctrl+C`.

---

### Manual Startup (Alternative)
<details>
<summary>Click to view manual multi-terminal instructions</summary>

#### Start the Backend Server
```bash
cd server
npm install
npm start
```
The server will start on `http://localhost:5000` and automatically initialize the database and seed the default administrator.

#### Start the Frontend Client
In a separate terminal window:
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:3000` in your web browser.

</details>

---

## 🔒 Security Best Practices Implemented
1. **No Sensitive Keys on Frontend**: All external API communications and geocoding requests are proxied and handled by the backend.
2. **Rate Limiting**: Brute-force protection on `/api/admin/login` (max 20 attempts/15min) and general API rate limiting (300 requests/15min).
3. **Password Security**: Strong hashing with `bcryptjs` (salt rounds: 10).
4. **Input Validation**: Coordinates, queries, and anonymous user tokens are strictly validated before database execution.
5. **Strict Privacy Boundary**: The `/api/location/update` endpoint verifies database consent before recording any telemetry. If consent is `0` or absent, the server returns HTTP 403 and immediately drops the payload.
