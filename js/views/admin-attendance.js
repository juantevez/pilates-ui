import { api } from "../api.js";
import { html, mount } from "../html.js";
import { icons } from "../icons.js";
import { hhmm, initials, longDate, relativeDay, today } from "../format.js";
import { emptyState, errorState, on, spinner, toastError, withLoading } from "../ui.js";
import { dateBar, shiftWeekday, statusBadge } from "./admin-common.js";

export const title = "Asistencia";

export function render(root) {
  let fecha = today();
  let classes = null;

  const attendee = (a) => html`
    <div class="attendee">
      <div class="avatar" aria-hidden="true">${initials(a.full_name)}</div>
      <div class="list-body"><div class="title">${a.full_name}</div><div class="small muted">${a.email}</div></div>
      <div class="toggle" role="group" aria-label="Asistencia de ${a.full_name}">
        <button data-action="mark" data-id="${a.turno_id}" data-value="true" class="${a.status === "asistio" ? "on-yes" : ""}"
          aria-pressed="${a.status === "asistio"}">Asistió</button>
        <button data-action="mark" data-id="${a.turno_id}" data-value="false" class="${a.status === "no_asistio" ? "on-no" : ""}"
          aria-pressed="${a.status === "no_asistio"}">Ausente</button>
      </div>
    </div>`;

  const classCard = (c) => {
    const marked = c.alumnos.filter((a) => a.status !== "confirmada").length;
    return html`
      <article class="card">
        <div class="class-top" style="margin-bottom:8px">
          <div>
            <div class="class-time">${hhmm(c.start_time)}<small>a ${hhmm(c.end_time)}</small></div>
            <div class="class-meta">${c.alumnos.length}/${c.capacidad} alumnos · ${marked} marcados</div>
          </div>
          ${c.status !== "activa" ? statusBadge(c.status) : ""}
        </div>
        ${c.alumnos.length ? c.alumnos.map(attendee) : html`<p class="small muted">Sin alumnos anotados.</p>`}
      </article>`;
  };

  const paint = () => {
    const rel = relativeDay(fecha);
    mount(root, html`
      <div class="page-head">
        <div><h1>Asistencia</h1>
          <p class="muted cap">${longDate(fecha)}${rel ? ` · ${rel}` : ""}</p></div>
        ${dateBar(fecha)}
      </div>
      ${classes === null ? spinner() : classes.length
        ? html`<div class="grid">${classes.map(classCard)}</div>`
        : html`<div class="card">${emptyState(icons.check, "No hay clases este día")}</div>`}`);
  };

  async function load() {
    classes = null;
    paint();
    try {
      classes = await api.get("/admin/asistencia", { fecha });
      paint();
    } catch (err) {
      mount(root, errorState(err));
    }
  }

  on(root, "change", "[data-date-input]", (el) => { if (el.value) { fecha = el.value; load(); } });
  on(root, "click", "[data-action]", async (el) => {
    const action = el.dataset.action;
    if (action === "retry") return load();
    if (action === "prev-day" || action === "next-day") {
      fecha = shiftWeekday(fecha, action === "prev-day" ? -1 : 1);
      return load();
    }
    if (action === "mark") {
      await withLoading(el, async () => {
        try {
          const turno = await api.post(`/admin/turnos/${el.dataset.id}/asistencia`, { asistio: el.dataset.value === "true" });
          // Actualización optimista local, sin recargar toda la vista.
          classes.forEach((c) => c.alumnos.forEach((a) => { if (a.turno_id === turno.id) a.status = turno.status; }));
        } catch (err) {
          toastError(err);
        }
      });
      paint();
    }
  });

  load();
}
