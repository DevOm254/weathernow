// Generates or retrieves a persistent anonymous user identifier
export function getAnonymousUserId() {
  const STORAGE_KEY = 'weathernow_anon_id';
  let anonId = localStorage.getItem(STORAGE_KEY);
  if (!anonId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      anonId = `anon_${crypto.randomUUID().slice(0, 8)}`;
    } else {
      anonId = `anon_${Math.random().toString(36).substring(2, 10)}`;
    }
    localStorage.setItem(STORAGE_KEY, anonId);
  }
  return anonId;
}
