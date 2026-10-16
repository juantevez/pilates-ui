import { api } from "../api.js";
import { html, mount } from "../html.js";
import { icons } from "../icons.js";
import { initials } from "../format.js";
import { confirmDialog, debounce, dialog, emptyState, errorState, on, spinner, toast } from "../ui.js";

export const title = "Alumnos";
const PAGE = 50;

export function render(root) {
  const filters = { search: "", estado: "" };
  let users = null;
  let hasMore = false;

  const row = (u) => html`
    <tr>
      <td data-label="Alumno">
        <div class="row" style="flex-wrap:nowrap">
          <div class="avatar" aria-hidden="true">${initials(u.full_name)}</div>
          <div><div><strong>${u.full_name}</strong> ${u.role === "admin" ? html`<span class="badge badge-info">admin</span>` : ""}</div>
          <div class="small muted">${u.email}</div></div>
        </div>
      </td>
      <td data-label="Estado">
        ${u.status === "bloqueado" ? html`<span class="badge badge-danger">Bloqueado</span>` : html`<span class="badge badge-success">Activo</span>`}
        ${u.blocked_reason ? html`<div class="small muted">${u.blocked_reason}</div>` : ""}
      </td>
      <td data-label="Reservas activas">${u.reservas_activas}</td>
      <td data-label="Asistencias">${u.asistencias}</td>
      <td data-label="Ausencias">${u.ausencias ? html`<span class="badge badge-warning">${u.ausencias}</span>` : "0"}</td>
      <td class="actions">
        ${u.role === "admin" ? "" : u.status === "bloqueado"
          ? html`<button class="btn btn-ghost btn-sm" data-action="unblock" data-id="${u.id}">Desbloquear</button>`
          : html`<button class="btn btn-danger btn-sm" data-action="block" data-id="${u.id}">Bloquear</button>`}
      </td>
    </tr>`;

  const paintList = () => {
    mount(root.querySelector("[data-list]"), users === null ? spinner() : users.length ? html`
      <table class="table">
        <thead><tr><th>Alumno</th><th>Estado</th><th>Activas</th><th>Asistencias</th><th>Ausencias</th><th></th></tr></thead>
        <tbody>${users.map(row)}</tbody>
      </table>
      ${hasMore ? html`<p style="text-align:center;margin-top:12px"><button class="btn btn-ghost" data-action="more">Cargar más</button></p>` : ""}`
      : emptyState(icons.users, "No se encontraron alumnos"));
  };

  mount(root, html`
    <div class="page-head">
      <div><h1>Alumnos</h1><p class="muted">Asistencia, ausencias y bloqueo de cuentas.</p></div>
    </div>
    <div class="card stack">
      <div class="form-row">
        <input class="input" type="search" placeholder="Buscar por nombre o email" data-search aria-label="Buscar">
        <select class="input" data-status aria-label="Estado">
          <option value="">Todos</option><option value="activo">Activos</option><option value="bloqueado">Bloqueados</option>
        </select>
      </div>
      <div data-list></div>
    </div>`);

  async function load({ append = false } = {}) {
    if (!append) { users = null; paintList(); }
    try {
      const page = await api.get("/admin/usuarios", {
        search: filters.search, estado: filters.estado, limit: PAGE, offset: append ? users.length : 0,
      });
      users = append ? users.concat(page) : page;
      hasMore = page.length === PAGE;
      paintList();
    } catch (err) {
      mount(root.querySelector("[data-list]"), errorState(err));
    }
  }

  const find = (id) => users.find((u) => u.id === id);

  on(root, "input", "[data-search]", debounce((el) => { filters.search = el.value.trim(); load(); }, 350));
  on(root, "change", "[data-status]", (el) => { filters.estado = el.value; load(); });
  on(root, "click", "[data-action]", async (el) => {
    const action = el.dataset.action;
    if (action === "retry") return load();
    if (action === "more") return load({ append: true });
    const u = find(el.dataset.id);
    if (action === "block") {
      const values = await dialog({
        title: `Bloquear a ${u.full_name}`,
        message: "No podrá ingresar ni reservar. Sus turnos futuros se cancelan y se liberan los cupos.",
        fields: [{ name: "motivo", label: "Motivo", type: "textarea", placeholder: "Ej: cuota impaga" }],
        submitText: "Bloquear",
        danger: true,
        onSubmit: (v) => api.post(`/admin/usuarios/${u.id}/bloquear`, { motivo: v.motivo }),
      });
      if (values) { toast("Usuario bloqueado.", "success"); load(); }
    }
    if (action === "unblock") {
      const ok = await confirmDialog({
        title: `Desbloquear a ${u.full_name}`,
        message: "Podrá volver a ingresar y reservar.",
        submitText: "Desbloquear",
        onSubmit: () => api.post(`/admin/usuarios/${u.id}/desbloquear`),
      });
      if (ok) { toast("Usuario desbloqueado.", "success"); load(); }
    }
  });

  load();
}
