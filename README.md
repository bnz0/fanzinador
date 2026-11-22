# Fanzinador

Sube un PDF y descarga una hoja imprimible lista para plegar.

- 1–8 páginas → fanzine de 8 páginas (1 hoja, 1 cara, 1 corte).
- 9–16 páginas → fanzine de 16 páginas (1 hoja, 2 caras, voltear por el borde largo).
- Se completa con páginas en blanco si faltan.

Todo corre en el navegador (pdf-lib); no hay backend. El sitio está en `docs/`.

## Publicar en GitHub Pages
1. Crea el repo y sube esta carpeta (`git init && git add . && git commit && git push`).
2. En GitHub: Settings → Pages → Source: *Deploy from a branch* → rama `main`, carpeta `/docs`.
3. La app queda en `https://<usuario>.github.io/<repo>/`.

Para probar local: abre `docs/index.html` en el navegador.
