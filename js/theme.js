// Tema claro/oscuro: preferencia del usuario (sistema | claro | oscuro) persistida en localStorage.
// js/theme-init.js aplica el tema antes del primer pintado; este módulo lo mantiene.

import { html } from "./html.js";
import { icons } from "./icons.js";

const KEY = "pilates.theme";
const ORDER = ["system", "light", "dark"];
const LABELS = { system: "Sistema", light: "Claro", dark: "Oscuro" };
const ICONS = { system: icons.monitor, light: icons.sun, dark: icons.moon };
const BAR_COLOR = { light: "#5f7d6b", dark: "#1b1c1a" };
const media = window.matchMedia("(prefers-color-scheme: dark)");

function load() {
  try {
    const value = localStorage.getItem(KEY);
    return ORDER.includes(value) ? value : "system";
  } catch {
    return "system";
  }
}

let preference = load();

function apply() {
  const resolved = preference === "system" ? (media.matches ? "dark" : "light") : preference;
  document.documentElement.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BAR_COLOR[resolved]);
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.innerHTML = String(buttonContent());
    btn.title = `Tema: ${LABELS[preference]} (cambiar)`;
    btn.setAttribute("aria-label", btn.title);
  });
}

const buttonContent = () => html`${ICONS[preference]}<span class="sr-only">Tema: ${LABELS[preference]}</span>`;

/** Botón que rota entre Sistema → Claro → Oscuro. */
export const themeToggle = () => html`
  <button type="button" class="btn btn-ghost btn-sm" data-theme-toggle
    title="Tema: ${LABELS[preference]} (cambiar)" aria-label="Tema: ${LABELS[preference]} (cambiar)">${buttonContent()}</button>`;

export function cycleTheme() {
  preference = ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length];
  try {
    if (preference === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, preference);
  } catch { /* modo privado: la preferencia vive sólo en memoria */ }
  apply();
}

// Si la preferencia es "sistema", acompaña los cambios del sistema operativo en vivo.
media.addEventListener("change", () => { if (preference === "system") apply(); });
apply();
