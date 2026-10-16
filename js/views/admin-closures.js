import { api } from "../api.js";
import { html, mount } from "../html.js";
import { icons } from "../icons.js";
import { addDays, longDate, today, toISODate } from "../format.js";
import { confirmDialog, dialog, emptyState, errorState, on, spinner, toast } from "../ui.js";
import { monthCalendar, monthRange, monthState } from "../components/month-calendar.js";
import { TIPOS_CIERRE, shiftWeekday, tipoLabel } from "./admin-common.js";

export const title = "Cierres";

/** Agrupa días hábiles consecutivos con el mismo tipo y motivo (ej. vacaciones cargadas como rango). */
function groupClosures(list) {
  const groups = [];
  for (const c of list) {
    const last = groups.at(-1);
    if (last && last.tipo === c.tipo && (last.motivo ?? "") === (c.motivo ?? "") && shiftWeekday(last.hasta, 1) === c.fecha) {
      last.hasta = c.fecha;
      last.dias += 1;
    } else {
      groups.push({ desde: c.fecha, hasta: c.fecha, dias: 1, tipo: c.tipo, motivo: c.motivo, id: c.id });
    }
  }
  return groups;
}

export function render(root) {
  const nav = monthState();
  let days = null;
  let upcoming = null;

  const paint = () => {
    const byDate = Object.fromEntries((days ?? []).map((d) => [d.fecha, d]));
    const todayIso = today();
    mount(root, html`
      <div class="page-head">
        <div><h1>Feriados y cierres</h1>
          <p class="muted">Los días cerrados no generan clases. Si ya había reservas, se cancelan y se avisa a los alumnos.</p></div>
        <button class="btn btn-primary" data-action="new">${icons.plus} Nuevo cierre</button>
      </div>
      <div class="stack">
        <div class="card">
          ${days === null ? spinner() : monthCalendar({
            year: nav.year,
            month: nav.month,
            renderDay: (iso, { weekend }) => {
              const d = byDate[iso];
              const future = iso >= todayIso;
              if (d?.cierre) {
                return {
                  className: "closed", clickable: true, title: tipoLabel(d.cierre.tipo),
                  content: html`<span class="label">${d.cierre.motivo || tipoLabel(d.cierre.tipo)}</span><span class="dot"></span>`,
                };
              }
              if (weekend) return {};
              return {
                clickable: future,
                title: future ? "Cargar cierre" : "",
                content: d?.clases ? html`<span class="label muted">${d.reservas} reserva${d.reservas === 1 ? "" : "s"}</span>` : "",
              };
            },
          })}
          <div class="cal-legend">
            <span><i style="background:var(--accent-soft)"></i>Cerrado (click para editar o reabrir)</span>
            <span><i style="background:var(--surface-2);border:1px solid var(--border)"></i>Día hábil (click para cerrar)</span>
          </div>
        </div>
        <div class="card">
          <h3 style="margin-bottom:6px">Próximos cierres</h3>
          ${upcoming === null ? spinner() : upcoming.length ? html`
            <div class="list">${groupClosures(upcoming).map((g) => html`
              <div class="list-item">
                <div class="list-body">
                  <div class="title cap">${g.dias === 1 ? longDate(g.desde) : `${longDate(g.desde)} al ${longDate(g.hasta)}`}</div>
                  <div class="small muted">${tipoLabel(g.tipo)}${g.motivo ? ` · ${g.motivo}` : ""}${g.dias > 1 ? ` · ${g.dias} días hábiles` : ""}</div>
                </div>
                <div class="list-actions">
                  ${g.dias === 1 ? html`<button class="btn btn-ghost btn-sm" data-action="edit" data-date="${g.desde}">Editar</button>` : ""}
                  <button class="btn btn-primary btn-sm" data-action="reopen" data-desde="${g.desde}" data-hasta="${g.hasta}" data-dias="${g.dias}">Reabrir</button>
                </div>
              </div>`)}</div>` : emptyState(icons.calendar, "No hay cierres cargados")}
        </div>
      </div>`);
  };

  async function load() {
    try {
      const [cal, next] = await Promise.all([
        api.get("/admin/calendario", monthRange(nav.year, nav.month)),
        api.get("/admin/cierres", { desde: today(), hasta: toISODate(addDays(new Date(), 365)) }),
      ]);
      days = cal;
      upcoming = next;
      paint();
    } catch (err) {
      mount(root, errorState(err));
    }
  }

  async function create(desde = "") {
    let created = [];
    const values = await dialog({
      title: "Nuevo cierre",
      message: "Podés cargar un día o un rango (ej. vacaciones). Los fines de semana se ignoran.",
      fields: [
        { name: "desde", label: "Desde", type: "date", value: desde, min: today(), required: true },
        { name: "hasta", label: "Hasta (opcional)", type: "date", min: today() },
        { name: "tipo", label: "Tipo", type: "select", options: TIPOS_CIERRE, value: "feriado_nacional", required: true },
        { name: "motivo", label: "Motivo", type: "textarea", placeholder: "Se muestra a los alumnos. Ej: Día de la Soberanía Nacional" },
      ],
      submitText: "Cargar cierre",
      onSubmit: async (v) => {
        created = await api.post("/admin/cierres", {
          desde: v.desde, hasta: v.hasta || null, tipo: v.tipo, motivo: v.motivo || null,
        });
      },
    });
    if (values) {
      toast(`Cierre cargado (${created.length} día${created.length === 1 ? "" : "s"}).`, "success");
      load();
    }
  }

  async function edit(fecha) {
    const cierre = days?.find((d) => d.fecha === fecha)?.cierre ?? upcoming?.find((c) => c.fecha === fecha);
    if (!cierre) return;
    const values = await dialog({
      title: `Cierre del ${longDate(fecha)}`,
      fields: [
        { name: "tipo", label: "Tipo", type: "select", options: TIPOS_CIERRE, value: cierre.tipo, required: true },
        { name: "motivo", label: "Motivo", type: "textarea", value: cierre.motivo ?? "" },
      ],
      submitText: "Guardar",
      secondary: { text: "Reabrir día", action: "delete" },
      onSubmit: (v) => api.put(`/admin/cierres/${cierre.id}`, { tipo: v.tipo, motivo: v.motivo || null }),
    });
    if (values?.action === "delete") {
      await reopen(fecha, fecha, 1);
      return;
    } else if (values) {
      toast("Cierre actualizado.", "success");
    }
    if (values) load();
  }

  async function reopen(desde, hasta, dias) {
    let result;
    const ok = await confirmDialog({
      title: dias === 1 ? `¿Reabrir el ${longDate(desde)}?` : `¿Reabrir ${dias} días?`,
      message: (dias === 1 ? "El día vuelve a ser hábil" : `Del ${longDate(desde)} al ${longDate(hasta)} vuelven a ser días hábiles`)
        + ". Si había alumnos con turno, les avisamos por email para que vuelvan a reservar (no se les restaura el lugar).",
      submitText: "Reabrir",
      cancelText: "Volver",
      onSubmit: async () => { result = await api.del("/admin/cierres", { desde, hasta }); },
    });
    if (ok) {
      const n = result.cierres_eliminados;
      toast(`Se reabri${n === 1 ? "ó 1 día" : `eron ${n} días`}.`, "success");
      load();
    }
  }

  on(root, "click", "[data-action]", (el) => {
    const action = el.dataset.action;
    if (action === "retry") return load();
    if (action === "new") return create();
    if (action === "edit") return edit(el.dataset.date);
    if (action === "reopen") return reopen(el.dataset.desde, el.dataset.hasta, Number(el.dataset.dias));
    if (action === "prev-month" || action === "next-month") {
      nav.shift(action === "prev-month" ? -1 : 1);
      days = null;
      paint();
      return load();
    }
    if (action === "day") {
      const d = days?.find((x) => x.fecha === el.dataset.date);
      return d?.cierre ? edit(el.dataset.date) : create(el.dataset.date);
    }
  });

  paint();
  load();
}
