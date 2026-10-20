import { api } from "./api.js";
import { html, mount } from "./html.js";
import { icons } from "./icons.js";
import { session } from "./session.js";
import { cycleTheme, themeToggle } from "./theme.js";
import { toast } from "./ui.js";

import * as login from "./views/login.js";
import * as register from "./views/register.js";
import * as forgot from "./views/forgot.js";
import * as reset from "./views/reset.js";
import * as book from "./views/book.js";
import * as myBookings from "./views/my-bookings.js";
import * as calendar from "./views/calendar.js";
import * as adminClasses from "./views/admin-classes.js";
import * as adminClosures from "./views/admin-closures.js";
import * as adminAttendance from "./views/admin-attendance.js";
import * as adminUsers from "./views/admin-users.js";

// access: guest = sólo sin sesión, any = siempre, user = logueado, admin = rol admin
const ROUTES = {
  "/login": { view: login, access: "guest" },
  "/registro": { view: register, access: "guest" },
  "/olvide": { view: forgot, access: "guest" },
  "/reset-password": { view: reset, access: "any" },
  "/reservar": { view: book, access: "user" },
  "/mis-turnos": { view: myBookings, access: "user" },
  "/calendario": { view: calendar, access: "user" },
  "/admin/clases": { view: adminClasses, access: "admin" },
  "/admin/cierres": { view: adminClosures, access: "admin" },
  "/admin/asistencia": { view: adminAttendance, access: "admin" },
  "/admin/usuarios": { view: adminUsers, access: "admin" },
};

const NAV = {
  alumno: [
    { path: "/reservar", label: "Reservar", icon: icons.book },
    { path: "/mis-turnos", label: "Mis turnos", icon: icons.list },
    { path: "/calendario", label: "Calendario", icon: icons.calendar },
  ],
  admin: [
    { path: "/admin/clases", label: "Clases", icon: icons.grid },
    { path: "/admin/asistencia", label: "Asistencia", icon: icons.check },
    { path: "/admin/cierres", label: "Cierres", icon: icons.closed },
    { path: "/admin/usuarios", label: "Alumnos", icon: icons.users },
  ],
};

const homePath = () => (!session.user ? "/login" : session.isAdmin ? "/admin/clases" : "/reservar");

let cleanup = null;

export function navigate(path, { replace = false } = {}) {
  if (replace) history.replaceState(null, "", path);
  else if (path !== location.pathname + location.search) history.pushState(null, "", path);
  render();
}

function resolve() {
  let path = location.pathname.replace(/\/+$/, "") || "/";
  // Links de los emails: /clases/{id} (lista de espera) -> grilla de reservas.
  if (path.startsWith("/clases/")) path = "/reservar";
  const route = ROUTES[path];
  if (!route) return { redirect: homePath() };
  if (route.access === "guest" && session.user) return { redirect: homePath() };
  if ((route.access === "user" || route.access === "admin") && !session.user) {
    return { redirect: `/login?next=${encodeURIComponent(location.pathname)}` };
  }
  if (route.access === "admin" && !session.isAdmin) return { redirect: homePath() };
  return { path, route };
}

function renderChrome(path) {
  const logged = Boolean(session.user);
  document.getElementById("topbar").hidden = !logged;
  document.getElementById("tabbar").hidden = !logged;
  if (!logged) return;
  const items = session.isAdmin ? NAV.admin : NAV.alumno;
  const link = (i) => html`<a href="${i.path}" data-link class="${i.path === path ? "active" : ""}"
    ${i.path === path ? html`aria-current="page"` : ""}>${i.icon}<span>${i.label}</span></a>`;
  mount(document.getElementById("topnav"), items.map((i) => html`<a href="${i.path}" data-link class="${i.path === path ? "active" : ""}">${i.label}</a>`));
  mount(document.getElementById("tabbar"), items.map(link));
  mount(document.getElementById("user-menu"), html`
    <span class="user-name">${session.user.full_name}</span>
    ${themeToggle()}
    <button class="btn btn-ghost btn-sm" data-logout title="Cerrar sesión">${icons.logout}<span class="sr-only">Salir</span></button>`);
}

async function render() {
  const result = resolve();
  if (result.redirect) {
    history.replaceState(null, "", result.redirect);
    return render();
  }
  cleanup?.();
  cleanup = null;
  renderChrome(result.path);

  const main = document.getElementById("main");
  const root = document.createElement("section");
  main.replaceChildren(root);
  document.title = `${result.route.view.title ?? ""} · Pilates Studio`.replace(/^ · /, "");
  window.scrollTo(0, 0);
  try {
    cleanup = (await result.route.view.render(root, { navigate, params: new URLSearchParams(location.search) })) ?? null;
  } catch (err) {
    console.error(err);
    toast(err.message, "error");
  }
}

// Navegación SPA en links internos
document.addEventListener("click", (ev) => {
  const a = ev.target.closest("a[data-link]");
  if (a && !ev.metaKey && !ev.ctrlKey && !ev.shiftKey && a.origin === location.origin) {
    ev.preventDefault();
    navigate(a.pathname + a.search);
  }
  if (ev.target.closest("[data-theme-toggle]")) cycleTheme();
  if (ev.target.closest("[data-logout]")) {
    manualLogout = true;
    // Revoca la sesión en el servidor (el token deja de servir aunque alguien lo haya copiado).
    // Si falla (sin conexión, token ya vencido), igual se cierra la sesión local.
    api.post("/auth/logout").catch(() => {}).finally(() => session.logout());
  }
});

window.addEventListener("popstate", render);

// Reactividad de sesión: login/logout (o token vencido) re-renderiza la app.
let wasLogged = Boolean(session.user);
let manualLogout = false;
session.subscribe(() => {
  const logged = Boolean(session.user);
  if (wasLogged && !logged && !manualLogout) toast("Tu sesión expiró. Volvé a ingresar.");
  manualLogout = false;
  wasLogged = logged;
  render();
});

render();
