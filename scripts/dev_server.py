"""Servidor estático para desarrollo con fallback de SPA (sin dependencias).

Uso: python3 scripts/dev_server.py [puerto]   (por defecto 3000)
"""

import http.server
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class SpaHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_head(self):
        path = self.translate_path(self.path)
        if not Path(path).exists():
            self.path = "/index.html"
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
    print(f"Pilates UI en http://localhost:{port}")
    http.server.ThreadingHTTPServer(("0.0.0.0", port), SpaHandler).serve_forever()
