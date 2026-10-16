// Templates seguros: todo lo interpolado se escapa salvo que venga envuelto en raw()/html``.

class SafeHtml {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escape(value) {
  return String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export function raw(value) {
  return new SafeHtml(value);
}

function render(value) {
  if (value === null || value === undefined || value === false) return "";
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join("");
  return escape(value);
}

export function html(strings, ...values) {
  let out = "";
  strings.forEach((s, i) => { out += s + (i < values.length ? render(values[i]) : ""); });
  return new SafeHtml(out);
}

export function mount(el, template) {
  el.innerHTML = render(template);
}
