// Configuración en tiempo de ejecución. En Docker se regenera a partir de la variable API_URL.
// Sin API_URL, la API se busca en el mismo host desde el que se abrió la página (puerto 8000):
// funciona igual con localhost que con la IP de la red local (ej. desde el teléfono).
window.APP_CONFIG = {
  apiUrl: `${location.protocol}//${location.hostname}:8000`,
};
