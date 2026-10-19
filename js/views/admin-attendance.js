import { api } from "../api.js";
import { html, mount } from "../html.js";
import { icons } from "../icons.js";
import { hhmm, initials, longDate, relativeDay, today } from "../format.js";
import { dialog, emptyState, errorState, on, spinner, toast, toastError, withLoading } from "../ui.js";
import { dateBar, shiftWeekday, statusBadge } from "./admin-common.js";

export const title = "Asistencia";

/** La clase ya terminó (hora local del navegador): no se puede agregar ni cancelar alumnos. */
function hasEnded(c) {
  const now = new Date();
  const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return c.fecha < today() || (c.fecha === today() && hhmm(c.end_time) <= hm);
}

export function render(root, { params }) {
  // Acceso directo desde el panel de Clases: /admin/asistencia?fecha=AAAA-MM-DD&clase=<id>
  let fecha = /^\d{4}-\d{2}-\d{2}$/.test(params.get("fecha") ?? "") ? params.get("fecha") : today();
  let focus = params.get("clase");
  let classes = null;

  const attendee = (a, c) => html`
    <div class="attendee">
      <div class="avatar" aria-hidden="true">${initials(a.full_name)}</div>
      <div class="list-body"><div class="title">${a.full_name}</div><div class="small muted">${a.email}</div></div>
      <div class="toggle" role="group" aria-label="Asistencia de ${a.full_name}">
        <button data-action="mark" data-id="${a.turno_id}" data-value="true" class="${a.status === "asistio" ? "on-yes" : ""}"
          aria-pressed="${a.status === "asistio"}">Asistió</button>
        <button data-action="mark" data-id="${a.turno_id}" data-value="false" class="${a.status === "no_asistio" ? "on-no" : ""}"
          aria-pressed="${a.status === "no_asistio"}">Ausente</button>
      </div>
      ${a.status === "confirmada" && !hasEnded(c)
        ? html`<button class="btn btn-ghost btn-icon" data-action="cancel-booking" data-id="${a.turno_id}" data-clase="${c.clase_id}"
            title="Cancelar turno" aria-label="Cancelar el turno de ${a.full_name}">${icons.x}</button>` : ""}
    </div>`;

  const classCard = (c) => {
    const marked = c.alumnos.filter((a) => a.status !== "confirmada").length;
    return html`
      <article class="card ${c.clase_id === focus ? "focus" : ""}" id="clase-${c.clase_id}">
        <div class="class-top" style="margin-bottom:8px">
          <div>
            <div class="class-time">${hhmm(c.start_time)}<small>a ${hhmm(c.end_time)}</small></div>
            <div class="class-meta">${c.alumnos.length}/${c.capacidad} alumnos · ${marked} marcados</div>
          </div>
          ${c.status !== "activa" ? statusBadge(c.status) : ""}
        </div>
        ${c.alumnos.length ? c.alumnos.map((a) => attendee(a, c)) : html`<p class="small muted">Sin alumnos anotados.</p>`}
        ${c.status === "activa" && !hasEnded(c) && c.alumnos.length < c.capacidad
          ? html`<button class="btn btn-aqua btn-sm" style="margin-top:12px" data-action="add" data-clase="${c.clase_id}">${icons.plus} Agregar alumno</button>` : ""}
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
      if (focus) root.querySelector(`#clase-${CSS.escape(focus)}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      mount(root, errorState(err));
    }
  }

  on(root, "change", "[data-date-input]", (el) => { if (el.value) { fecha = el.value; focus = null; load(); } });
  on(root, "click", "[data-action]", async (el) => {
    const action = el.dataset.action;
    if (action === "retry") return load();
    if (action === "prev-day" || action === "next-day") {
      fecha = shiftWeekday(fecha, action === "prev-day" ? -1 : 1);
      focus = null;
      return load();
    }
    if (action === "add") return addStudent(classes.find((c) => c.clase_id === el.dataset.clase), el);
    if (action === "cancel-booking") {
      const c = classes.find((x) => x.clase_id === el.dataset.clase);
      const a = c.alumnos.find((x) => x.turno_id === el.dataset.id);
      const values = await dialog({
        title: `Cancelar el turno de ${a.full_name}`,
        message: `Clase de las ${hhmm(c.start_time)}. Le llega un email avisándole y se libera el lugar para la lista de espera.`,
        fields: [{ name: "motivo", label: "Motivo (opcional)", type: "textarea", placeholder: "Ej: pidió cambiar de horario" }],
        submitText: "Cancelar turno",
        cancelText: "Volver",
        danger: true,
        onSubmit: (v) => api.post(`/admin/turnos/${a.turno_id}/cancelar`, { motivo: v.motivo }),
      });
      if (values) { toast("Turno cancelado.", "success"); load(); }
      return;
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

  /** Reserva en nombre de un alumno: el estudio sólo está limitado por el cupo de la clase. */
  async function addStudent(c, button) {
    let students;
    try {
      students = await withLoading(button, () => api.get("/admin/usuarios", { estado: "activo", limit: 200 }));
    } catch (err) {
      return toastError(err);
    }
    const anotados = new Set(c.alumnos.map((a) => a.user_id));
    const options = students
      .filter((u) => u.role !== "admin" && !anotados.has(u.id))
      .sort((x, y) => x.full_name.localeCompare(y.full_name, "es"))
      .map((u) => ({ value: u.id, label: `${u.full_name} · ${u.email}` }));
    if (!options.length) return toast("No hay alumnos activos para agregar a esta clase.");
    const values = await dialog({
      title: `Agregar alumno a la clase de las ${hhmm(c.start_time)}`,
      message: `${c.alumnos.length}/${c.capacidad} lugares ocupados. No aplican la ventana de reserva ni los límites por día; le llega el email de confirmación.`,
      fields: [{ name: "user_id", label: "Alumno", type: "select", required: true, options: [{ value: "", label: "Elegí un alumno" }, ...options] }],
      submitText: "Reservar",
      onSubmit: (v) => api.post("/admin/turnos", { user_id: v.user_id, clase_id: c.clase_id }),
    });
    if (values) { toast("Turno reservado.", "success"); load(); }
  }

  load();
}
