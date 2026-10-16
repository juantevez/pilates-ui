import { api } from "../api.js";
import { html, mount } from "../html.js";
import { formValues, withLoading } from "../ui.js";
import { authCard } from "./auth-layout.js";

export const title = "Nueva contraseña";

export function render(root, { params }) {
  const token = params.get("token");
  if (!token) {
    mount(root, authCard(html`<h1>Enlace inválido</h1>
      <p class="lead muted">El enlace de recuperación está incompleto.</p>
      <a class="btn btn-primary btn-block" href="/olvide" data-link>Pedir un enlace nuevo</a>`));
    return;
  }
  mount(root, authCard(html`
    <h1>Elegí una nueva contraseña</h1>
    <p class="lead muted">El enlace es de un solo uso.</p>
    <div data-body>
      <form class="form" novalidate>
        <div class="field">
          <label for="new_password">Nueva contraseña</label>
          <input class="input" id="new_password" name="new_password" type="password" autocomplete="new-password" minlength="8" required autofocus>
          <span class="hint">Mínimo 8 caracteres.</span>
        </div>
        <div class="field">
          <label for="password2">Repetila</label>
          <input class="input" id="password2" name="password2" type="password" autocomplete="new-password" minlength="8" required>
        </div>
        <p class="form-error" data-error></p>
        <button class="btn btn-primary btn-block" type="submit">Guardar contraseña</button>
      </form>
    </div>`));

  const form = root.querySelector("form");
  const errorEl = root.querySelector("[data-error]");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!form.checkValidity()) return form.reportValidity();
    const { new_password, password2 } = formValues(form);
    if (new_password !== password2) { errorEl.textContent = "Las contraseñas no coinciden."; return; }
    await withLoading(form.querySelector("button[type=submit]"), async () => {
      try {
        await api.post("/auth/reset-password", { token, new_password });
        mount(root.querySelector("[data-body]"), html`
          <div class="banner"><div><strong>¡Listo!</strong><p class="small">Tu contraseña fue actualizada.</p></div></div>
          <a class="btn btn-primary btn-block" style="margin-top:16px" href="/login" data-link>Ingresar</a>`);
      } catch (err) {
        errorEl.textContent = err.message;
      }
    });
  });
}
