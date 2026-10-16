// Papel picado multicolor cayendo (canvas, sin dependencias).

const COLORS = ["#1f9e8f", "#8ee3d4", "#c9785d", "#f2c14e", "#e86a92", "#5b8def", "#9b6ad6", "#6cc070"];

/**
 * Si el sistema pide "reducir movimiento" (común en Android con "Quitar animaciones"), se usa una versión
 * suave: menos papelitos, caída lenta y sin giros. force=true (click del usuario) siempre usa la completa.
 */
export function confetti({ duration = 4200, count = 220, force = false } = {}) {
  const gentle = !force && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (gentle) { count = 70; duration = 3500; }

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: 60 });
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  const rand = (a, b) => a + Math.random() * (b - a);
  const pieces = Array.from({ length: count }, () => ({
    x: rand(0, innerWidth),
    y: rand(-innerHeight * 0.6, -10),          // arrancan arriba, escalonados
    w: rand(6, 11),
    h: rand(9, 16),
    color: COLORS[(Math.random() * COLORS.length) | 0],
    shape: Math.random() < 0.18 ? "circle" : "rect",
    vy: gentle ? rand(1.2, 2) : rand(1.6, 3.6),
    vx: rand(-0.6, 0.6),
    rot: rand(0, Math.PI * 2),
    vrot: gentle ? 0 : rand(-0.12, 0.12),
    wobble: rand(0, Math.PI * 2),
    vwobble: gentle ? 0 : rand(0.04, 0.09),
  }));

  const start = performance.now();
  let frame;
  const tick = (now) => {
    const elapsed = now - start;
    const fade = elapsed > duration - 800 ? Math.max(0, (duration - elapsed) / 800) : 1;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of pieces) {
      p.wobble += p.vwobble;
      p.x += p.vx + Math.sin(p.wobble) * 0.9;   // vaivén del papel
      p.y += p.vy;
      p.rot += p.vrot;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.wobble));         // efecto de giro en 3D
      ctx.fillStyle = p.color;
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }
    if (elapsed < duration) frame = requestAnimationFrame(tick);
    else cleanup();
  };
  const cleanup = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    canvas.remove();
  };
  frame = requestAnimationFrame(tick);
}
