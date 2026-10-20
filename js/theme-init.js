// Aplica el tema antes de pintar (evita el destello claro). Es un script clásico y bloqueante a propósito:
// se carga en el <head> antes de los estilos. La lógica completa está en js/theme.js.
// Vive en un archivo (no inline) para que la Content-Security-Policy permita sólo scripts de 'self'.
(function () {
  var pref = "system";
  try { pref = localStorage.getItem("pilates.theme") || "system"; } catch (e) {}
  var dark = pref === "dark" || (pref !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  if (dark) document.querySelector('meta[name="theme-color"]').setAttribute("content", "#1b1c1a");
})();
