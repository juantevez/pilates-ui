const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "2026-10-13" -> Date local (sin corrimiento por zona horaria). */
export function parseDate(iso) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export const today = () => toISODate(new Date());
export const hhmm = (time) => (time ?? "").slice(0, 5);
export const dayName = (iso) => DIAS[parseDate(iso).getDay()];
export const shortDay = (iso) => DIAS_CORTOS[parseDate(iso).getDay()];
export const monthName = (monthIndex) => MESES[monthIndex];

export function longDate(iso) {
  const d = parseDate(iso);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function relativeDay(iso) {
  const diff = Math.round((parseDate(iso) - parseDate(today())) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  return null;
}

export function countdown(target) {
  const ms = new Date(target) - Date.now();
  if (ms <= 0) return null;
  const mins = Math.ceil(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h >= 24) return `${Math.floor(h / 24)} d ${h % 24} h`;
  return h ? `${h} h ${m} min` : `${m} min`;
}

export function dateTime(isoDateTime) {
  const d = new Date(isoDateTime);
  return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

export function isWeekday(iso) {
  const day = parseDate(iso).getDay();
  return day !== 0 && day !== 6;
}
