import { api } from "../api.js";
import { html, mount } from "../html.js";
import { icons } from "../icons.js";
import { countdown, hhmm, longDate, relativeDay, dateTime, today } from "../format.js";
import { confirmDialog, errorState, on, spinner, toast, toastError, withLoading } from "../ui.js";

export const title = "Reservar";
const REFRESH_MS = 30_000;

function spots(c) {
  const dots = Array.from({ length: c.capacidad }, (_, i) => html`<span class="${i < c.reservados ? "taken" : ""}"></span>`);
  const text = c.completa ? "Completa" : `${c.disponibles}/${c.capacidad} lugares disponibles`;
  return html`<div class="spots"><div class="spots-dots ${c.completa ? "full" : ""}" aria-hidden="true">${dots}</div><span>${text}</span></div>`;
}

function classStatus(c) {
  if (c.status === "cancelada") return html`<span class="badge badge-danger">Cancelada</span>`;
  if (c.status === "feriado") return html`<span class="badge badge-accent">Sin clase</span>`;
  if (c.mi_turno_id) return html`<span class="badge badge-success">${icons.check} Reservada</span>`;
  if (c.en_lista_espera) return html`<span class="badge badge-info">En lista de espera</span>`;
  if (c.completa) return html`<span class="badge badge-accent">Completa</span>`;
  return "";
}

function classActions(c) {
  if (c.mi_turno_id) {
    return c.puede_cancelar
      ? html`<button class="btn btn-ghost" data-action="cancel" data-id="${c.mi_turno_id}" data-time="${hhmm(c.start_time)}">Cancelar turno</button>`
      : html`<p class="small muted">Ya no se puede cancelar (menos de 1 h para la clase).</p>`;
  }
  if (c.en_lista_espera) {
    return html`<button class="btn btn-ghost" data-action="leave-waitlist" data-id="${c.clase_id}">Salir de la lista de espera</button>`;
  }
  if (c.puede_reservar) return html`<button class="btn btn-primary" data-action="book" data-id="${c.clase_id}">Reservar</button>`;
  if (c.puede_anotarse_lista_espera) {
    return html`<button class="btn btn-accent" data-action="join-waitlist" data-id="${c.clase_id}">Avisame si se libera</button>`;
  }
  return "";
}

function classCard(c) {
  const off = c.status !== "activa";
  return html`
    <article class="card class-card ${c.mi_turno_id ? "mine" : ""} ${off ? "off" : ""}">
      <div class="class-top">
        <div>
          <div class="class-time">${hhmm(c.start_time)}<small>a ${hhmm(c.end_time)}</small></div>
          ${c.instructor_name ? html`<div class="class-meta">con ${c.instructor_name}</div>` : ""}
        </div>
        ${classStatus(c)}
      </div>
      ${off ? "" : spots(c)}
      <div class="class-actions">${off ? "" : classActions(c)}</div>
    </article>`;
}

function dayView(day) {
  const rel = relativeDay(day.fecha);
  const head = html`<div class="day-head"><h2>${longDate(day.fecha)}</h2>${rel ? html`<span class="badge">${rel}</span>` : ""}</div>`;

  if (day.estado === "cerrado") {
    return html`<div class="day">${head}
      <div class="banner closed">${icons.closed}<div>
        <strong>El estudio permanecerá cerrado: ${day.motivo_cierre}</strong>
        <p class="small">Los turnos se habilitarán normalmente para el ${longDate(day.proximo_dia_habil)}.</p>
      </div></div></div>`;
  }
  if (day.estado === "pendiente_apertura") {
    const left = countdown(day.apertura);
    return html`<div class="day">${head}
      <div class="banner">${icons.clock}<div>
        <strong>Los turnos se habilitan el ${dateTime(day.apertura)} hs</strong>
        <p class="small">${left ? `Faltan ${left}. ` : ""}Te avisamos por email apenas se abran.</p>
      </div></div></div>`;
  }
  if (day.estado === "sin_clases" || !day.clases.length) {
    return html`<div class="day">${head}
      <div class="banner warning">${icons.info}<div><strong>Todavía no hay clases cargadas para este día.</strong>
      <p class="small">Volvé a intentar en unos minutos.</p></div></div></div>`;
  }
  const block = (name, label) => {
    const list = day.clases.filter((c) => c.bloque === name);
    return list.length ? html`<p class="block-title">${label}</p><div class="grid">${list.map(classCard)}</div>` : "";
  };
  return html`<div class="day">${head}${block("manana", "Turnos de la mañana")}${block("tarde", "Turnos de la tarde")}</div>`;
}

/** Hoy: sólo clases que todavía no empezaron; si no queda ninguna, el día no se muestra. */
function visibleDays(days) {
  const now = new Date();
  const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return days
    .map((d) => (d.fecha === today() ? { ...d, clases: d.clases.filter((c) => hhmm(c.start_time) > nowHHMM) } : d))
    .filter((d) => d.fecha !== today() || (d.estado === "abierta" && d.clases.length) || d.estado === "cerrado");
}

export function render(root) {
  let days = null;
  let timer = null;

  const paint = () => mount(root, html`
    <div class="page-head">
      <div>
        <h1>Reservá tu clase</h1>
        <p class="muted">Podés reservar las clases de hoy que quedan con lugar y las del siguiente día hábil. Máximo 2 por día (1 a la mañana y 1 a la tarde).</p>
      </div>
      <button class="btn btn-ghost btn-sm" data-action="retry">${icons.refresh} Actualizar</button>
    </div>
    ${days === null ? spinner() : visibleDays(days).map(dayView)}`);

  async function load({ silent = false } = {}) {
    try {
      days = await api.get("/clases/disponibles");
      paint();
      // Si la apertura ya llegó, recargar automáticamente.
      const opening = days.find((d) => d.estado === "pendiente_apertura");
      if (opening && !countdown(opening.apertura)) setTimeout(() => load({ silent: true }), 2000);
    } catch (err) {
      if (silent) return;
      mount(root, errorState(err));
    }
  }

  async function act(button, fn, okMessage) {
    await withLoading(button, async () => {
      try {
        await fn();
        if (okMessage) toast(okMessage, "success");
      } catch (err) {
        toastError(err);
      }
      await load({ silent: true });
    });
  }

  on(root, "click", "[data-action]", async (el) => {
    const id = el.dataset.id;
    switch (el.dataset.action) {
      case "retry":
        return withLoading(el, () => load());
      case "book":
        return act(el, () => api.post("/turnos", { clase_id: id }), "¡Reserva confirmada! Te enviamos un email.");
      case "cancel": {
        const ok = await confirmDialog({
          title: "¿Cancelar tu turno?",
          message: `Vas a liberar tu lugar en la clase de las ${el.dataset.time} hs.`,
          submitText: "Sí, cancelar",
        cancelText: "Volver",
          danger: true,
        });
        if (ok) await act(el, () => api.post(`/turnos/${id}/cancelar`), "Turno cancelado.");
        return;
      }
      case "join-waitlist":
        return act(el, () => api.post(`/clases/${id}/lista-espera`), "Te avisaremos por email si se libera un lugar.");
      case "leave-waitlist":
        return act(el, () => api.del(`/clases/${id}/lista-espera`), "Saliste de la lista de espera.");
    }
  });

  paint();
  load();
  // Cupos en vivo: refresco periódico mientras la pestaña está visible.
  timer = setInterval(() => { if (document.visibilityState === "visible") load({ silent: true }); }, REFRESH_MS);
  const onVisible = () => { if (document.visibilityState === "visible") load({ silent: true }); };
  document.addEventListener("visibilitychange", onVisible);
  return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
}
