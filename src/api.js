// API_BASE = trailing slash ছাড়া URL
// Vercel এ VITE_API_URL environment variable সেট করুন
// যেমন: https://tv.shohozvibe.com  (শেষে / দেবেন না)
const raw = import.meta.env.VITE_API_URL || 'https://tv.shohozvibe.com';
export const API_BASE = raw.replace(/\/+$/, ''); // trailing slash remove

// Token helpers
export const getToken  = () => sessionStorage.getItem('tv_admin_token') || '';
export const setToken  = (t) => sessionStorage.setItem('tv_admin_token', t);
export const clearToken = () => sessionStorage.removeItem('tv_admin_token');
export const isLoggedIn = () => !!getToken();

// Base fetch — সব request এখান থেকে যায়
async function api(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['X-Admin-Token'] = token;

  let res;
  try {
    res = await fetch(`${API_BASE}/${path}`, {
      ...opts,
      headers,
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    throw new Error('Server এ connect করা যাচ্ছে না। Backend URL চেক করুন।');
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Server থেকে invalid response (HTTP ${res.status})`);
  }

  if (!json.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json.data;
}

// Auth
export async function login(password) {
  const data = await api('login', { method: 'POST', body: { password } });
  setToken(data.token);
  return data;
}
export async function changePassword(password) {
  return api('password', { method: 'POST', body: { password } });
}

// Public
export async function getPublicPlaylists() {
  return api('playlists');
}
export async function getPlaylistContent(id) {
  // playlist-content.php সরাসরি call — index.php routing bypass
  const token = getToken();
  const headers = {};
  if (token) headers['X-Admin-Token'] = token;
  let res;
  try {
    res = await fetch(`${API_BASE}/playlist-content.php?id=${id}`, { headers });
  } catch {
    throw new Error('Content load করা যাচ্ছে না');
  }
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Content load failed');
  return json.data;
}

// Admin
export async function getAdminPlaylists() { return api('playlists'); }
export async function createPlaylist(data) { return api('playlists', { method: 'POST', body: data }); }
export async function updatePlaylist(id, data) { return api(`playlists/${id}`, { method: 'PUT', body: data }); }
export async function deletePlaylist(id) { return api(`playlists/${id}`, { method: 'DELETE' }); }
export async function reorderPlaylists(ids) { return api('reorder', { method: 'POST', body: { ids } }); }
