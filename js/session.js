// Sesión del usuario: store reactivo mínimo persistido en localStorage.

const KEY = "pilates.session";
const listeners = new Set();
let state = load();

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (!data?.token || isExpired(data.token)) return null;
    return data;
  } catch {
    return null;
  }
}

function isExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function persist() {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
    else localStorage.removeItem(KEY);
  } catch { /* modo privado: la sesión vive sólo en memoria */ }
  listeners.forEach((fn) => fn(state));
}

export const session = {
  get user() { return state?.user ?? null; },
  get token() { return state?.token ?? null; },
  get isAdmin() { return state?.user?.role === "admin"; },
  login({ access_token, user }) { state = { token: access_token, user }; persist(); },
  update(user) { if (state) { state = { ...state, user }; persist(); } },
  logout() { if (state) { state = null; persist(); } },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
