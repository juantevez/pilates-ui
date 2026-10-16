import { api } from "../api.js";
import { html, mount } from "../html.js";
import { session } from "../session.js";
import { formValues, withLoading } from "../ui.js";
import { authCard, enterApp } from "./auth-layout.js";

export const title = "Ingresar";

export function render(root, { params }) {
  mount(root, authCard(html`
    <h1>Hola de nuevo</h1>
    <p class="lead muted">Ingresá para reservar tu clase.</p>
    <form class="form" novalidate>
      <div class="field">
        <label for="email">Email</label>
        <input class="input" id="email" name="email" type="email" autocomplete="email" required autofocus>
      </div>
      <div class="field">
        <label for="password">Contraseña</label>
        <input class="input" id="password" name="password" type="password" autocomplete="current-password" required>
      </div>
      <p class="form-error" data-error></p>
      <button class="btn btn-primary btn-block" type="submit">Ingresar</button>
    </form>
    <div class="auth-links">
      <a href="/registro" data-link>Crear cuenta</a>
      <a href="/olvide" data-link>Olvidé mi contraseña</a>
    </div>`));

  const form = root.querySelector("form");
  const errorEl = root.querySelector("[data-error]");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!form.checkValidity()) return form.reportValidity();
    errorEl.textContent = "";
    await withLoading(form.querySelector("button[type=submit]"), async () => {
      try {
        const auth = await api.post("/auth/login", formValues(form));
        enterApp(session, auth, params.get("next"));
      } catch (err) {
        errorEl.textContent = err.message;
      }
    });
  });
}
