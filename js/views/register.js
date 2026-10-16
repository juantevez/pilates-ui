import { api } from "../api.js";
import { html, mount } from "../html.js";
import { session } from "../session.js";
import { formValues, withLoading } from "../ui.js";
import { authCard, enterApp } from "./auth-layout.js";

export const title = "Crear cuenta";

export function render(root) {
  mount(root, authCard(html`
    <h1>Creá tu cuenta</h1>
    <p class="lead muted">Reservá tus clases de Pilates en segundos.</p>
    <form class="form" novalidate>
      <div class="field">
        <label for="full_name">Nombre y apellido</label>
        <input class="input" id="full_name" name="full_name" autocomplete="name" required maxlength="200" autofocus>
      </div>
      <div class="field">
        <label for="email">Email</label>
        <input class="input" id="email" name="email" type="email" autocomplete="email" required>
      </div>
      <div class="field">
        <label for="password">Contraseña</label>
        <input class="input" id="password" name="password" type="password" autocomplete="new-password" minlength="8" required>
        <span class="hint">Mínimo 8 caracteres.</span>
      </div>
      <div class="field">
        <label for="password2">Repetí la contraseña</label>
        <input class="input" id="password2" name="password2" type="password" autocomplete="new-password" minlength="8" required>
      </div>
      <p class="form-error" data-error></p>
      <button class="btn btn-primary btn-block" type="submit">Crear cuenta</button>
    </form>
    <div class="auth-links"><span class="muted">¿Ya tenés cuenta?</span><a href="/login" data-link>Ingresar</a></div>`));

  const form = root.querySelector("form");
  const errorEl = root.querySelector("[data-error]");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!form.checkValidity()) return form.reportValidity();
    const { full_name, email, password, password2 } = formValues(form);
    if (password !== password2) { errorEl.textContent = "Las contraseñas no coinciden."; return; }
    errorEl.textContent = "";
    await withLoading(form.querySelector("button[type=submit]"), async () => {
      try {
        await api.post("/auth/register", { full_name, email, password });
        enterApp(session, await api.post("/auth/login", { email, password }), "/reservar");
      } catch (err) {
        errorEl.textContent = err.message;
      }
    });
  });
}
