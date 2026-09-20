// Configurable backend API base URL
// If running locally or on same domain, defaults to empty string ('')
// For deployed frontend (e.g., GitHub Pages or Vercel), set VITE_API_BASE_URL to your deployed backend URL
export const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
