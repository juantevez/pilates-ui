import { html } from "../html.js";
import { icons } from "../icons.js";
import { addDays, parseDate, toISODate } from "../format.js";

export const CLASS_STATUS = {
  activa: ["Activa", "badge-success"],
  cancelada: ["Cancelada", "badge-danger"],
  feriado: ["Cerrada (cierre)", "badge-accent"],
};

export const TIPOS_CIERRE = [
  { value: "feriado_nacional", label: "Feriado nacional" },
  { value: "vacaciones_gym", label: "Vacaciones del estudio" },
  { value: "enfermedad_instructor", label: "Enfermedad del instructor" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "otro", label: "Otro" },
];
export const tipoLabel = (v) => TIPOS_CIERRE.find((t) => t.value === v)?.label ?? v;

export function statusBadge(status) {
  const [label, cls] = CLASS_STATUS[status] ?? [status, ""];
  return html`<span class="badge ${cls}">${label}</span>`;
}

/** Barra de fecha: ← [input date] → saltando fines de semana. */
export const dateBar = (iso) => html`
  <div class="datebar">
    <button class="btn btn-ghost btn-icon" data-action="prev-day" aria-label="Día anterior">${icons.left}</button>
    <input class="input" type="date" value="${iso}" data-date-input aria-label="Fecha">
    <button class="btn btn-ghost btn-icon" data-action="next-day" aria-label="Día siguiente">${icons.right}</button>
  </div>`;

export function shiftWeekday(iso, delta) {
  let d = addDays(parseDate(iso), delta);
  while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, delta);
  return toISODate(d);
}

export function meter(value, max) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return html`<div class="meter ${value >= max ? "full" : ""}" role="img" aria-label="${value} de ${max}"><span style="width:${pct}%"></span></div>`;
}
