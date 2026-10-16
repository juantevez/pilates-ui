import { html, raw } from "../html.js";

let uid = 0;

function polar(c, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return [c + r * Math.sin(rad), c - r * Math.cos(rad)];
}

function arc(c, r, from, to) {
  const [x1, y1] = polar(c, r, from);
  const [x2, y2] = polar(c, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/**
 * Anillo de ocupación.
 * - Con capacidad chica (≤ 12) se divide en un segmento por lugar; cada reserva pinta un segmento
 *   con gradiente verde agua.
 * - Con capacidad grande (ej. el total del día) se dibuja como progreso continuo.
 * `fresh`: cuántos de los segmentos ocupados son nuevos (se animan al aparecer).
 */
export function occupancyRing({ value, capacity, size = 112, stroke = 12, muted = false, fresh = 0, center, caption }) {
  const id = `ring-grad-${++uid}`;
  const c = size / 2;
  const r = (size - stroke) / 2;
  const filled = Math.min(value, capacity);
  const full = capacity > 0 && filled >= capacity;
  const paint = muted ? "var(--ring-muted)" : `url(#${id})`;
  let body;

  if (capacity > 1 && capacity <= 12) {
    const step = 360 / capacity;
    const gap = Math.min(9, step * 0.1); // separación visible entre cuartos
    body = Array.from({ length: capacity }, (_, i) => {
      const d = arc(c, r, i * step + gap / 2, (i + 1) * step - gap / 2);
      if (i >= filled) return `<path d="${d}" class="ring-track ring-cut" stroke-width="${stroke}" fill="none"/>`;
      const isNew = i >= filled - fresh;
      return `<path d="${d}" class="ring-seg${isNew ? " ring-new" : ""}" stroke="${paint}" stroke-width="${stroke}"
        fill="none" stroke-linecap="butt" pathLength="1" style="animation-delay:${isNew ? (i - (filled - fresh)) * 120 : 0}ms"/>`;
    }).join("");
  } else {
    const pct = capacity ? filled / capacity : 0;
    const circ = 2 * Math.PI * r;
    body = `<circle cx="${c}" cy="${c}" r="${r}" class="ring-track" stroke-width="${stroke}" fill="none"/>
      <circle cx="${c}" cy="${c}" r="${r}" class="ring-seg ring-progress" stroke="${paint}" stroke-width="${stroke}" fill="none"
        stroke-linecap="round" transform="rotate(-90 ${c} ${c})"
        stroke-dasharray="${(pct * circ).toFixed(2)} ${circ.toFixed(2)}" ${pct === 0 ? 'visibility="hidden"' : ""}/>`;
  }

  return html`
    <div class="ring ${full && !muted ? "ring-full" : ""} ${fresh && !muted ? "ring-bump" : ""}" style="width:${size}px;height:${size}px"
      role="img" aria-label="${value} de ${capacity} lugares reservados">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
        <defs>
          <linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${size}" y2="${size}">
            <stop offset="0" stop-color="var(--aqua-1)"/>
            <stop offset="1" stop-color="var(--aqua-2)"/>
          </linearGradient>
        </defs>
        ${raw(body)}
      </svg>
      <div class="ring-center">
        ${center ?? html`<b>${value}<span>/${capacity}</span></b>`}
        ${caption ? html`<small>${caption}</small>` : ""}
      </div>
    </div>`;
}
