import { api } from "../api.js";
import { html, mount } from "../html.js";
import { icons } from "../icons.js";
import { hhmm, isWeekday, longDate, relativeDay, today } from "../format.js";
import { confirmDialog, dialog, emptyState, errorState, on, spinner, toast, withLoading } from "../ui.js";
import { occupancyRing } from "../components/ring.js";
import { confetti } from "../components/confetti.js";
import { dateBar, shiftWeekday, statusBadge } from "./admin-common.js";

export const title = "Clases";
const LIVE_MS = 15_000;

/** La clase ya empezó (hora local del navegador): no se puede cancelar ni reactivar. */
function hasStarted(c) {
  const now = new Date();
  const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return c.fecha < today() || (c.fecha === today() && hhmm(c.start_time) <= hm);
}

const firstWeekday = (iso) => (isWeekday(iso) ? iso : shiftWeekday(iso, 1));
/* Clases ya festejadas: persistido en el navegador para no repetir el festejo al recargar,
   pero sí mostrarlo si la clase se llenó mientras el admin no estaba mirando. */
const CELEBRATED_KEY = "pilates.admin.celebrated";
function loadCelebrated() {
  try { return new Set(JSON.parse(localStorage.getItem(CELEBRATED_KEY)) ?? []); } catch { return new Set(); }
}
function saveCelebrated(set) {
  try { localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...set].slice(-300))); } catch { /* sin storage */ }
}

/** Devuelve las clases completas aún no festejadas y actualiza el registro. */
function pendingCelebrations(list) {
  const celebrated = loadCelebrated();
  const pending = [];
  for (const c of list) {
    const full = c.status === "activa" && c.reservados >= c.max_capacity;
    if (full && !celebrated.has(c.id)) {
      pending.push(c);
      celebrated.add(c.id);
    } else if (!full) {
      celebrated.delete(c.id); // si se libera un lugar y se vuelve a llenar, se festeja de nuevo
    }
  }
  saveCelebrated(celebrated);
  return pending;
}

const signature = (list) => list.map((c) => `${c.id}:${c.reservados}:${c.lista_espera}:${c.status}:${c.max_capacity}`).join("|");

function summary(classes) {
  const active = classes.filter((c) => c.status === "activa");
  const capacity = active.reduce((n, c) => n + c.max_capacity, 0);
  const booked = active.reduce((n, c) => n + c.reservados, 0);
  return {
    capacity,
    booked,
    free: capacity - booked,
    full: active.filter((c) => c.reservados >= c.max_capacity).length,
    waiting: active.reduce((n, c) => n + c.lista_espera, 0),
    active: active.length,
  };
}

export function render(root) {
  let fecha = firstWeekday(today());
  let classes = null;
  let fresh = new Map(); // clase_id -> reservas nuevas desde el refresco anterior (se animan)

  const slotCard = (c) => {
    const off = c.status !== "activa";
    return html`
      <article class="card slot-card ${off ? "off" : ""}">
        ${!off && c.reservados >= c.max_capacity ? html`<button type="button" class="ring-btn" data-action="celebrate"
          data-id="${c.id}" title="¡Clase completa! Click para festejar" aria-label="Festejar clase completa">` : ""}
        ${occupancyRing({
          value: c.reservados,
          capacity: c.max_capacity,
          muted: off,
          fresh: fresh.get(c.id) ?? 0,
          caption: off ? "" : c.reservados >= c.max_capacity ? "completa" : `${c.max_capacity - c.reservados} ${c.max_capacity - c.reservados === 1 ? "libre" : "libres"}`,
        })}
        ${!off && c.reservados >= c.max_capacity ? html`</button>` : ""}
        <div class="slot-info">
          <div class="class-time">${hhmm(c.start_time)}<small>a ${hhmm(c.end_time)}</small></div>
          <div class="small muted">${c.instructor_name ? `con ${c.instructor_name}` : "Sin instructor asignado"}</div>
          <div class="row">
            ${off ? statusBadge(c.status) : ""}
            ${c.lista_espera ? html`<span class="badge badge-accent">${c.lista_espera} en espera</span>` : ""}
          </div>
          ${c.cancel_reason ? html`<div class="small muted">${c.cancel_reason}</div>` : ""}
          <div class="slot-actions">
            ${c.status === "activa" && c.reservados > 0 && c.fecha <= today()
              ? html`<a class="btn btn-aqua btn-sm" href="/admin/asistencia?fecha=${c.fecha}&clase=${c.id}" data-link>${icons.check} Asistencia</a>` : ""}
            <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${c.id}">Editar</button>
            ${c.status === "activa" && !hasStarted(c) ? html`<button class="btn btn-danger btn-sm" data-action="cancel" data-id="${c.id}">Cancelar</button>` : ""}
            ${c.status === "cancelada" && !hasStarted(c) ? html`<button class="btn btn-primary btn-sm" data-action="reactivate" data-id="${c.id}">Reactivar</button>` : ""}
            ${c.status === "feriado" ? html`<a class="btn btn-ghost btn-sm" href="/admin/cierres" data-link>Ver cierre</a>` : ""}
          </div>
        </div>
      </article>`;
  };

  const block = (name, label) => {
    const list = classes.filter((c) => c.bloque === name);
    return list.length ? html`<p class="block-title">${label}</p><div class="slots">${list.map(slotCard)}</div>` : "";
  };

  const dashboard = () => {
    const s = summary(classes);
    const totalFresh = [...fresh.values()].reduce((a, b) => a + b, 0);
    return html`
      <div class="card dash-summary">
        ${occupancyRing({ value: s.booked, capacity: s.capacity, size: 148, stroke: 14, fresh: totalFresh, caption: "reservados" })}
        <div class="dash-stats">
          <div class="stat aqua"><b>${s.capacity ? Math.round((s.booked / s.capacity) * 100) : 0}%</b><span>ocupación</span></div>
          <div class="stat"><b>${s.free}</b><span>lugares libres</span></div>
          <div class="stat"><b>${s.full}<span class="muted small"> / ${s.active}</span></b><span>clases completas</span></div>
          <div class="stat"><b>${s.waiting}</b><span>en lista de espera</span></div>
        </div>
      </div>
      ${block("manana", "Turnos de la mañana")}
      ${block("tarde", "Turnos de la tarde")}`;
  };

  const paint = () => {
    const rel = relativeDay(fecha);
    const isLive = fecha >= today() && classes?.length;
    mount(root, html`
      <div class="page-head">
        <div><h1>Clases del día</h1>
          <p class="muted cap">${longDate(fecha)}${rel ? ` · ${rel}` : ""}
            ${isLive ? html`<span class="live" style="margin-left:8px">En vivo</span>` : ""}</p></div>
        <div class="row">
          ${dateBar(fecha)}
          <button class="btn btn-ghost btn-icon" data-action="refresh" aria-label="Actualizar">${icons.refresh}</button>
        </div>
      </div>
      <div class="stack">
        ${classes === null ? html`<div class="card">${spinner()}</div>` : classes.length ? dashboard() : html`
          <div class="card">
            ${emptyState(icons.grid, "No hay clases generadas para este día",
              isWeekday(fecha) ? "Se generan automáticamente con la apertura nocturna, o podés generarlas ahora." : "Los fines de semana no hay clases.")}
            ${isWeekday(fecha) ? html`<p style="text-align:center"><button class="btn btn-primary" data-action="generate">${icons.plus} Generar grilla</button></p>` : ""}
          </div>`}
      </div>`);
  };

  /**
   * Carga la grilla. Con live=true (refresco periódico o botón) compara con lo que ya se mostraba:
   * las reservas nuevas pintan su segmento con animación y avisan con un toast. Sólo repinta si algo cambió.
   */
  async function load({ live = false } = {}) {
    const requested = fecha;
    if (!live) { classes = null; paint(); }
    try {
      const next = await api.get("/admin/clases", { fecha });
      if (requested !== fecha) return; // el usuario cambió de día mientras cargaba
      const previous = live && classes ? new Map(classes.map((c) => [c.id, c.reservados])) : null;
      if (live && classes && signature(next) === signature(classes)) return;
      fresh = new Map();
      const news = [];
      if (previous) {
        for (const c of next) {
          const before = previous.get(c.id);
          if (before !== undefined && c.reservados > before) {
            fresh.set(c.id, c.reservados - before);
            news.push(c);
          }
        }
      }
      classes = next;
      paint();
      // Festejo: clases completas que el admin todavía no vio (en vivo o al entrar). Sólo hoy o días futuros.
      const filledUp = fecha >= today() ? pendingCelebrations(next) : [];
      news.filter((c) => !filledUp.includes(c))
        .forEach((c) => toast(`Nueva reserva · ${hhmm(c.start_time)} hs (${c.reservados}/${c.max_capacity})`, "success"));
      if (filledUp.length) {
        const horas = filledUp.map((c) => hhmm(c.start_time)).join(", ");
        toast(filledUp.length === 1 ? `🎉 ¡Clase de las ${horas} completa!` : `🎉 ¡${filledUp.length} clases completas! (${horas})`, "success", 6000);
        confetti();
      }
    } catch (err) {
      if (!live) mount(root, errorState(err));
    }
  }

  const find = (id) => classes.find((c) => c.id === id);

  on(root, "change", "[data-date-input]", (el) => { if (el.value) { fecha = el.value; load(); } });
  on(root, "click", "[data-action]", async (el) => {
    const action = el.dataset.action;
    if (action === "retry") return load();
    if (action === "refresh") return withLoading(el, () => load({ live: true }));
    if (action === "celebrate") {
      toast(`🎉 ¡Clase de las ${hhmm(find(el.dataset.id).start_time)} completa!`, "success");
      return confetti({ force: true });
    }
    if (action === "prev-day" || action === "next-day") {
      fecha = shiftWeekday(fecha, action === "prev-day" ? -1 : 1);
      return load();
    }
    if (action === "generate") {
      const values = await dialog({
        title: "Generar grilla",
        message: `Se crearán las clases del ${longDate(fecha)} según la grilla estándar.`,
        fields: [{ name: "notificar", type: "checkbox", label: "Avisar a los alumnos por email que ya pueden reservar" }],
        submitText: "Generar",
        onSubmit: (v) => api.post("/admin/clases/generar", { fecha, notificar: v.notificar }),
      });
      if (values) { toast("Grilla generada.", "success"); load(); }
      return;
    }
    const c = find(el.dataset.id);
    if (action === "edit") {
      const values = await dialog({
        title: `Clase de las ${hhmm(c.start_time)}`,
        fields: [
          { name: "max_capacity", label: "Capacidad", type: "number", min: 1, max: 50, value: c.max_capacity, required: true,
            hint: `Hay ${c.reservados} reservas activas; no puede ser menor.` },
          { name: "instructor_name", label: "Instructor", value: c.instructor_name ?? "", placeholder: "Opcional" },
        ],
        submitText: "Guardar",
        onSubmit: (v) => api.patch(`/admin/clases/${c.id}`, { max_capacity: Number(v.max_capacity), instructor_name: v.instructor_name }),
      });
      if (values) { toast("Clase actualizada.", "success"); load(); }
    }
    if (action === "reactivate") {
      const ok = await confirmDialog({
        title: `Reactivar la clase de las ${hhmm(c.start_time)}`,
        message: "Vuelve a estar disponible para reservar. Si había alumnos con turno, les avisamos por email "
          + "para que vuelvan a reservar (no se les restaura el lugar automáticamente).",
        submitText: "Reactivar",
        cancelText: "Volver",
        onSubmit: () => api.post(`/admin/clases/${c.id}/reactivar`),
      });
      if (ok) { toast("Clase reactivada.", "success"); load(); }
      return;
    }
    if (action === "cancel") {
      let result;
      const values = await dialog({
        title: `Cancelar la clase de las ${hhmm(c.start_time)}`,
        message: c.reservados
          ? `Hay ${c.reservados} alumno(s) con turno. Se cancelarán sus reservas y recibirán un email con el motivo.`
          : "No hay alumnos anotados en esta clase.",
        fields: [{ name: "motivo", label: "Motivo", type: "textarea", required: true, placeholder: "Ej: el instructor está enfermo" }],
        submitText: "Cancelar clase",
        cancelText: "Volver",
        danger: true,
        onSubmit: async (v) => { result = await api.post(`/admin/clases/${c.id}/cancelar`, { motivo: v.motivo }); },
      });
      if (values) { toast(`Clase cancelada. Turnos anulados: ${result.turnos_cancelados}.`, "success"); load(); }
    }
  });

  load();
  // Actualización en vivo mientras la pestaña está visible y el día no pasó.
  const timer = setInterval(() => {
    if (document.visibilityState === "visible" && classes !== null && fecha >= today()) load({ live: true });
  }, LIVE_MS);
  return () => clearInterval(timer);
}
