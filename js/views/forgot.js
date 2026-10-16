import { api } from "../api.js";
import { html, mount } from "../html.js";
import { formValues, withLoading } from "../ui.js";
import { authCard } from "./auth-layout.js";

export const title = "Recuperar contraseña";

export function render(root) {
  mount(root, authCard(html`
    <h1>¿Olvidaste tu contraseña?</h1>
    <p class="lead muted">Te enviamos un enlace por email para crear una nueva.</p>
    <div data-body>
      <form class="form" novalidate>
        <div class="field">
          <label for="email">Email</label>
          <input class="input" id="email" name="email" type="email" autocomplete="email" required autofocus>
        </div>
        <p class="form-error" data-error></p>
        <button class="btn btn-primary btn-block" type="submit">Enviar enlace</button>
      </form>
    </div>
    <div class="auth-links"><a href="/login" data-link>Volver a ingresar</a></div>`));

  const form = root.querySelector("form");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!form.checkValidity()) return form.reportValidity();
    await withLoading(form.querySelector("button[type=submit]"), async () => {
      try {
        const { detail } = await api.post("/auth/forgot-password", formValues(form));
        mount(root.querySelector("[data-body]"), html`<div class="banner"><div><strong>Revisá tu correo</strong><p class="small">${detail}</p></div></div>`);
      } catch (err) {
        root.querySelector("[data-error]").textContent = err.message;
      }
    });
  });
}
