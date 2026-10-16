# Pilates Studio — UI

Front-end del sistema de reservas, hecho en **HTML, CSS y JavaScript vanilla** (ES modules). No usa frameworks ni paso de build. Es una SPA con router propio y diseño mobile-first.

Consume la API de `py-pilates` (FastAPI).

## Levantar

**Con Docker** (nginx, puerto 3000):

```bash
docker compose up -d --build
# otra URL de API:
API_URL=https://api.mi-estudio.com docker compose up -d --build
```

El contenedor genera `config.js` al arrancar. Si `API_URL` no está definida, el front usa el mismo host desde el que se abrió la página, en el puerto 8000. Por eso funciona igual desde `localhost` que desde otro dispositivo de la red (ej. `http://192.168.0.2:3000` en el teléfono).

### Acceso desde el teléfono (misma red Wi-Fi)

1. En el `.env` del backend, agregá el origen en `CORS_ORIGINS` (ej. `http://localhost:3000,http://192.168.0.2:3000`). Opcionalmente, poné `FRONTEND_URL=http://192.168.0.2:3000` para que los links de los emails abran en el teléfono.
2. Reiniciá la API: `docker compose up -d` en `py-pilates`.
3. En el teléfono, abrí `http://<IP-de-la-PC>:3000`.

**Sin Docker** (servidor de desarrollo con fallback de SPA, sin dependencias):

```bash
python3 scripts/dev_server.py 3000
```

El backend debe permitir el origen del front en `CORS_ORIGINS` (por defecto `http://localhost:3000`). Además, su `FRONTEND_URL` tiene que apuntar a este front, porque los links de los emails (`/reset-password?token=…`, `/reservar`, `/clases/{id}`) se resuelven acá.

## Pantallas

| Ruta | Rol | Qué hace |
|---|---|---|
| `/login`, `/registro`, `/olvide`, `/reset-password` | público | Autenticación y recuperación de contraseña |
| `/reservar` | alumno | Grilla del siguiente día hábil con lugares en vivo (refresco cada 30 s). Permite reservar, cancelar y anotarse en lista de espera. Muestra la cuenta regresiva a la apertura de las 20:00 y el aviso de día cerrado |
| `/mis-turnos` | alumno | Próximas clases e historial, con su estado (asistió, ausente, cancelada por el estudio…) |
| `/calendario` | alumno | Calendario mensual con feriados y cierres |
| `/admin/clases` | admin | Panel del día: anillo con la ocupación total y una tarjeta por clase con un anillo dividido en tantos segmentos como lugares, que se pintan en verde agua con cada reserva. Se actualiza en vivo cada 15 s, con animación y aviso por cada reserva nueva. Cuando una clase se completa, festeja con papel picado multicolor. Permite editar capacidad e instructor, cancelar con motivo, **reactivar** una clase cancelada y generar la grilla |
| `/admin/asistencia` | admin | Check-in: marcar asistió / ausente por alumno |
| `/admin/cierres` | admin | Calendario de cierres: un click en un día lo cierra, edita o reabre. Permite cargar rangos (vacaciones). Los días seguidos se agrupan y se **reabren** de una sola vez |
| `/admin/usuarios` | admin | Búsqueda, estadísticas de asistencia, bloqueo y desbloqueo |

## Estructura

```
index.html            Shell (topbar desktop, tabbar mobile, toasts, <dialog>)
config.js             URL de la API (runtime)
css/styles.css        Tokens de diseño, modo oscuro automático, layout responsive
js/app.js             Router (History API) y guards por rol
js/api.js             Cliente fetch: JWT y errores {error, detail}. Un 401 cierra la sesión
js/session.js         Store reactivo de sesión (localStorage + suscriptores)
js/html.js            Templates con escape automático (protección XSS)
js/ui.js              Toasts, diálogo modal genérico, delegación de eventos
js/format.js          Fechas en español, cuenta regresiva
js/components/        Calendario mensual, anillo de ocupación (SVG) y papel picado (canvas)
js/views/             Una vista por pantalla
```
