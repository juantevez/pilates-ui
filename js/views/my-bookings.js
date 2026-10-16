import { api } from "../api.js";
import { html, mount } from "../html.js";
import { icons } from "../icons.js";
import { hhmm, parseDate, shortDay, relativeDay, monthName } from "../format.js";
import { confirmDialog, emptyState, errorState, on, spinner, toast, toastError, withLoading } from "../ui.js";

export const title = "Mis turnos";

const STATUS = {
  confirmada: ["Confirmada", "badge-success"],
  cancelada: ["Cancelada", ""],
  cancelada_por_admin: ["Cancelada por el estudio", "badge-danger"],
  asistio: ["Asististe", "badge-info"],
  no_asistio: ["Ausente", "badge-warning"],
};

function item(b, past) {
  const d = parseDate(b.fecha);
  const [label, cls] = STATUS[b.status] ?? [b.status, ""];
  const rel = relativeDay(b.fecha);
  return html`
    <div class="list-item">
      <div class="date-chip ${past ? "past" : ""}"><span>${shortDay(b.fecha)}</span><b>${d.getDate()}</b><span>${monthName(d.getMonth()).slice(0, 3)}</span></div>
      <div class="list-body">
        <div class="title">${hhmm(b.start_time)} a ${hhmm(b.end_time)} hs ${rel ? html`<span class="muted small">· ${rel}</span>` : ""}</div>
        <div class="row small" style="margin-top:4px">
          <span class="badge ${cls}">${label}</span>
          ${b.instructor_name ? html`<span class="muted">con ${b.instructor_name}</span>` : ""}
        </div>
        ${b.cancel_reason ? html`<p class="small muted" style="margin-top:4px">Motivo: ${b.cancel_reason}</p>` : ""}
      </div>
      ${b.puede_cancelar ? html`<div class="list-actions">
        <button class="btn btn-ghost btn-sm" data-action="cancel" data-id="${b.turno_id}" data-time="${hhmm(b.start_time)}">Cancelar</button></div>` : ""}
    </div>`;
}

export function render(root) {
  let data = null;
  let tab = "proximas";

  const paint = () => {
    const list = data?.[tab] ?? [];
    mount(root, html`
      <div class="page-head">
        <div><h1>Mis turnos</h1><p class="muted">Tus próximas clases y tu historial.</p></div>
        <div class="tabs" role="tablist">
          <button role="tab" data-action="tab" data-tab="proximas" class="${tab === "proximas" ? "active" : ""}" aria-selected="${tab === "proximas"}">
            Próximas${data ? ` (${data.proximas.length})` : ""}</button>
          <button role="tab" data-action="tab" data-tab="pasadas" class="${tab === "pasadas" ? "active" : ""}" aria-selected="${tab === "pasadas"}">Pasadas</button>
        </div>
      </div>
      <div class="card">
        ${data === null ? spinner() : list.length
          ? html`<div class="list">${list.map((b) => item(b, tab === "pasadas"))}</div>`
          : tab === "proximas"
            ? html`${emptyState(icons.book, "No tenés clases reservadas", "Reservá tu próxima clase desde la grilla.")}
                <p style="text-align:center"><a class="btn btn-primary" href="/reservar" data-link>Ver clases disponibles</a></p>`
            : emptyState(icons.list, "Todavía no tenés historial")}
      </div>`);
  };

  async function load() {
    try {
      data = await api.get("/turnos/mios");
      paint();
    } catch (err) {
      mount(root, errorState(err));
    }
  }

  on(root, "click", "[data-action]", async (el) => {
    if (el.dataset.action === "retry") return load();
    if (el.dataset.action === "tab") { tab = el.dataset.tab; return paint(); }
    if (el.dataset.action === "cancel") {
      const ok = await confirmDialog({
        title: "¿Cancelar tu turno?",
        message: `Vas a liberar tu lugar en la clase de las ${el.dataset.time} hs.`,
        submitText: "Sí, cancelar",
        cancelText: "Volver",
        danger: true,
      });
      if (!ok) return;
      await withLoading(el, async () => {
        try {
          await api.post(`/turnos/${el.dataset.id}/cancelar`);
          toast("Turno cancelado.", "success");
        } catch (err) {
          toastError(err);
        }
        await load();
      });
    }
  });

  paint();
  load();
}
