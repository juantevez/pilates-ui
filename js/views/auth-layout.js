import { html } from "../html.js";

export const authCard = (content) => html`
  <div class="auth">
    <div class="card auth-card">
      <a href="/" data-link class="brand"><span class="brand-mark" aria-hidden="true"></span><span>Pilates Studio</span></a>
      ${content}
    </div>
  </div>`;

/** Entra a la app: deja la URL de destino lista y actualiza la sesión (el router re-renderiza). */
export function enterApp(session, auth, next) {
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  history.replaceState(null, "", safeNext);
  session.login(auth);
}
