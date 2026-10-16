import { session } from "./session.js";

const BASE = (window.APP_CONFIG?.apiUrl || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function messageFrom(data) {
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) {
    return data.detail.map((d) => `${d.loc?.at(-1) ?? ""}: ${d.msg}`.replace(/^: /, "")).join(". ");
  }
  return "Ocurrió un error inesperado. Probá de nuevo.";
}

async function request(method, path, { body, query } = {}) {
  const url = new URL(BASE + path);
  Object.entries(query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (session.token) headers.Authorization = `Bearer ${session.token}`;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "network", "No se pudo conectar con el servidor.");
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && session.token) session.logout();
    throw new ApiError(res.status, data?.error ?? "error", messageFrom(data));
  }
  return data;
}

export const api = {
  get: (path, query) => request("GET", path, { query }),
  post: (path, body = {}) => request("POST", path, { body }),
  put: (path, body) => request("PUT", path, { body }),
  patch: (path, body) => request("PATCH", path, { body }),
  del: (path, query) => request("DELETE", path, { query }),
};
