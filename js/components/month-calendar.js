import { html } from "../html.js";
import { icons } from "../icons.js";
import { monthName, toISODate, today } from "../format.js";

const DOW = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

/** Primer y último día (ISO) del mes. */
export function monthRange(year, month) {
  return { desde: toISODate(new Date(year, month, 1)), hasta: toISODate(new Date(year, month + 1, 0)) };
}

/**
 * Grilla mensual (semanas de lunes a domingo).
 * renderDay(iso, { weekend, today }) debe devolver { className, content, clickable, title }.
 */
export function monthCalendar({ year, month, renderDay }) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayIso = today();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(html`<div class="cal-day out" aria-hidden="true"></div>`);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const iso = toISODate(date);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const info = renderDay(iso, { weekend, today: iso === todayIso }) ?? {};
    const cls = ["cal-day", weekend && "weekend", iso === todayIso && "today", info.className].filter(Boolean).join(" ");
    const inner = html`<span class="num">${d}</span>${info.content ?? ""}`;
    cells.push(
      info.clickable
        ? html`<button type="button" class="${cls}" data-action="day" data-date="${iso}" title="${info.title ?? ""}">${inner}</button>`
        : html`<div class="${cls}" title="${info.title ?? ""}">${inner}</div>`
    );
  }
  return html`
    <div class="cal-head">
      <button class="btn btn-ghost btn-icon" data-action="prev-month" aria-label="Mes anterior">${icons.left}</button>
      <h2>${monthName(month)} ${year}</h2>
      <button class="btn btn-ghost btn-icon" data-action="next-month" aria-label="Mes siguiente">${icons.right}</button>
    </div>
    <div class="cal" role="grid">
      ${DOW.map((d) => html`<div class="cal-dow">${d}</div>`)}
      ${cells}
    </div>`;
}

/** Estado de navegación mensual reutilizable. */
export function monthState() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    shift(delta) {
      const d = new Date(this.year, this.month + delta, 1);
      this.year = d.getFullYear();
      this.month = d.getMonth();
    },
  };
}
