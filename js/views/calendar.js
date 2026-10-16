import { api } from "../api.js";
import { html, mount } from "../html.js";
import { longDate } from "../format.js";
import { errorState, on, spinner } from "../ui.js";
import { monthCalendar, monthRange, monthState } from "../components/month-calendar.js";

export const title = "Calendario";

export function render(root) {
  const nav = monthState();
  let days = null;

  const paint = () => {
    const byDate = Object.fromEntries((days ?? []).map((d) => [d.fecha, d]));
    const closures = (days ?? []).filter((d) => d.tipo_cierre);
    mount(root, html`
      <div class="page-head">
        <div><h1>Calendario</h1><p class="muted">Días con clases, feriados y cierres del estudio.</p></div>
      </div>
      <div class="stack">
        <div class="card">
          ${days === null ? spinner() : monthCalendar({
            year: nav.year,
            month: nav.month,
            renderDay: (iso) => {
              const d = byDate[iso];
              if (d?.tipo_cierre) {
                return { className: "closed", title: d.etiqueta, content: html`<span class="label">${d.etiqueta}</span><span class="dot"></span>` };
              }
              return {};
            },
          })}
          <div class="cal-legend">
            <span><i style="background:var(--surface-2);border:1px solid var(--border)"></i>Con clases</span>
            <span><i style="background:var(--accent-soft)"></i>Feriado / cierre</span>
            <span><i style="border:1.5px solid var(--primary)"></i>Hoy</span>
          </div>
        </div>
        ${days && closures.length ? html`
          <div class="card">
            <h3 style="margin-bottom:6px">Sin clases este mes</h3>
            <div class="list">
              ${closures.map((d) => html`
                <div class="list-item">
                  <div class="list-body">
                    <div class="title cap">${longDate(d.fecha)}</div>
                    <div class="small muted">${d.etiqueta}${d.motivo ? ` · ${d.motivo}` : ""}</div>
                  </div>
                </div>`)}
            </div>
          </div>` : ""}
      </div>`);
  };

  async function load() {
    days = null;
    paint();
    try {
      days = await api.get("/calendario", monthRange(nav.year, nav.month));
      paint();
    } catch (err) {
      mount(root, errorState(err));
    }
  }

  on(root, "click", "[data-action]", (el) => {
    const action = el.dataset.action;
    if (action === "prev-month") { nav.shift(-1); load(); }
    if (action === "next-month") { nav.shift(1); load(); }
    if (action === "retry") load();
  });

  load();
}
