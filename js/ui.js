import { html, mount } from "./html.js";

/* ---------- Toasts ---------- */
export function toast(message, type = "info", ms = 4000) {
  const box = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  box.append(el);
  setTimeout(() => el.remove(), ms);
}

export const toastError = (err) => toast(err?.message ?? String(err), "error", 6000);

/* ---------- Botones con estado de carga ---------- */
export async function withLoading(button, fn) {
  if (!button || button.classList.contains("loading")) return;
  button.classList.add("loading");
  button.disabled = true;
  try {
    return await fn();
  } finally {
    button.classList.remove("loading");
    button.disabled = false;
  }
}

/* ---------- Diálogo genérico (confirmación / formulario) ---------- */
function fieldTemplate(f) {
  const id = `dlg-${f.name}`;
  let control;
  if (f.type === "select") {
    control = html`<select class="input" id="${id}" name="${f.name}" ${f.required ? "required" : ""}>
      ${f.options.map((o) => html`<option value="${o.value}" ${o.value === f.value ? "selected" : ""}>${o.label}</option>`)}
    </select>`;
  } else if (f.type === "textarea") {
    control = html`<textarea class="input" id="${id}" name="${f.name}" maxlength="${f.maxlength ?? 500}"
      placeholder="${f.placeholder ?? ""}" ${f.required ? "required" : ""}>${f.value ?? ""}</textarea>`;
  } else if (f.type === "checkbox") {
    return html`<label class="check"><input type="checkbox" name="${f.name}" ${f.value ? "checked" : ""}> ${f.label}</label>`;
  } else {
    control = html`<input class="input" id="${id}" name="${f.name}" type="${f.type ?? "text"}" value="${f.value ?? ""}"
      placeholder="${f.placeholder ?? ""}" ${f.min !== undefined ? html`min="${f.min}"` : ""} ${f.max !== undefined ? html`max="${f.max}"` : ""}
      ${f.required ? "required" : ""}>`;
  }
  return html`<div class="field"><label for="${id}">${f.label}</label>${control}${f.hint ? html`<span class="hint">${f.hint}</span>` : ""}</div>`;
}

/**
 * Abre un diálogo modal. Devuelve una Promise con:
 *  - los valores del formulario (objeto) si se confirma,
 *  - { action } si se eligió la acción secundaria,
 *  - null si se cancela.
 * `onSubmit(values)` opcional: si lanza error se muestra dentro del diálogo sin cerrarlo.
 */
export function dialog({ title, message, fields = [], submitText = "Aceptar", cancelText = "Cancelar", danger = false, secondary, onSubmit }) {
  const dlg = document.getElementById("dialog");
  mount(dlg, html`
    <form method="dialog" novalidate>
      <h2>${title}</h2>
      ${message ? html`<p class="muted">${message}</p>` : ""}
      ${fields.map(fieldTemplate)}
      <p class="form-error" data-error></p>
      <div class="dialog-actions">
        ${secondary ? html`<button type="button" class="btn btn-danger left" data-secondary>${secondary.text}</button>` : ""}
        <button type="button" class="btn btn-ghost" data-cancel>${cancelText}</button>
        <button type="submit" class="btn ${danger ? "btn-danger" : "btn-primary"}" data-submit>${submitText}</button>
      </div>
    </form>`);

  return new Promise((resolve) => {
    const form = dlg.querySelector("form");
    const errorEl = dlg.querySelector("[data-error]");
    const finish = (value) => { dlg.close(); resolve(value); };

    dlg.querySelector("[data-cancel]").onclick = () => finish(null);
    dlg.querySelector("[data-secondary]")?.addEventListener("click", () => finish({ action: secondary.action }));
    dlg.oncancel = (e) => { e.preventDefault(); finish(null); };

    form.onsubmit = async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const values = {};
      fields.forEach((f) => {
        const el = form.elements[f.name];
        values[f.name] = f.type === "checkbox" ? el.checked : el.value.trim();
      });
      if (!onSubmit) return finish(values);
      try {
        errorEl.textContent = "";
        await withLoading(dlg.querySelector("[data-submit]"), () => onSubmit(values));
        finish(values);
      } catch (err) {
        errorEl.textContent = err.message;
      }
    };
    dlg.showModal();
    form.querySelector("input, select, textarea")?.focus();
  });
}

export const confirmDialog = (opts) => dialog(opts).then((v) => v !== null);

/* ---------- Estados de carga / vacío ---------- */
export const spinner = () => html`<div class="spinner" aria-label="Cargando"></div>`;

export function emptyState(icon, title, text = "") {
  return html`<div class="empty">${icon}<p><strong>${title}</strong></p>${text ? html`<p class="small">${text}</p>` : ""}</div>`;
}

export function errorState(err, retryAction = "retry") {
  return html`<div class="banner warning"><div><strong>No pudimos cargar la información</strong>
    <p class="small">${err.message}</p>
    <button class="btn btn-ghost btn-sm" style="margin-top:10px" data-action="${retryAction}">Reintentar</button></div></div>`;
}

/* ---------- Helpers de formularios ---------- */
export function formValues(form) {
  return Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));
}

/** Delegación de eventos: on(root, "click", "[data-action]", (el, ev) => ...) */
export function on(root, type, selector, handler) {
  root.addEventListener(type, (ev) => {
    const el = ev.target.closest(selector);
    if (el && root.contains(el)) handler(el, ev);
  });
}

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
