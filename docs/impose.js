/* Imposición de fanzines: 1 hoja, 8 páginas (1 lado) o 16 páginas (2 lados).
   Funciona en navegador (window.Impose) y en Node (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Impose = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // Tamaños de hoja en puntos PDF, apaisados [ancho, alto].
  const SHEETS = {
    A4: [841.89, 595.28],
    Letter: [792, 612],
    A3: [1190.55, 841.89],
    Tabloid: [1224, 792],
  };

  // Cada celda: [fila (0 = arriba), columna, nº de página (1-based), rotada 180°]
  const LAYOUTS = {
    // Mini-zine clásico: 1 hoja, 1 lado, 1 corte central, 3 pliegues.
    8: [[
      [0, 0, 5, true], [0, 1, 4, true], [0, 2, 3, true], [0, 3, 2, true],
      [1, 0, 6, false], [1, 1, 7, false], [1, 2, 8, false], [1, 3, 1, false],
    ]],
    // Octavo: 1 hoja, anverso y reverso (voltear por el borde largo), 3 pliegues.
    16: [
      [ // anverso
        [0, 0, 5, true], [0, 1, 12, true], [0, 2, 9, true], [0, 3, 8, true],
        [1, 0, 4, false], [1, 1, 13, false], [1, 2, 16, false], [1, 3, 1, false],
      ],
      [ // reverso
        [0, 0, 7, true], [0, 1, 10, true], [0, 2, 11, true], [0, 3, 6, true],
        [1, 0, 2, false], [1, 1, 15, false], [1, 2, 14, false], [1, 3, 3, false],
      ],
    ],
  };

  function chooseFormat(n) {
    if (n < 1) throw new Error('El PDF no tiene páginas.');
    if (n > 16) throw new Error('El PDF tiene ' + n + ' páginas; el máximo es 16.');
    return n <= 8 ? 8 : 16;
  }

  /* Orden final de páginas (índices 0-based de origen, null = hoja en blanco). */
  function buildOrder(n, format, keepBackCover) {
    const order = Array.from({ length: n }, (_, i) => i);
    const blanks = format - n;
    if (blanks > 0) {
      const pad = Array(blanks).fill(null);
      if (keepBackCover && n > 1) order.splice(n - 1, 0, ...pad);
      else order.push(...pad);
    }
    return order;
  }

  async function imposeFanzine(PDFLib, srcBytes, opts) {
    opts = Object.assign({ sheet: 'A4', guides: true, keepBackCover: false, margin: 4 }, opts);
    const { PDFDocument, rgb, degrees } = PDFLib;
    const src = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
    const n = src.getPageCount();
    const format = chooseFormat(n);
    const order = buildOrder(n, format, opts.keepBackCover);

    const [W, H] = SHEETS[opts.sheet] || SHEETS.A4;
    const cw = W / 4, ch = H / 2;

    const out = await PDFDocument.create();
    const embedded = await out.embedPdf(src, Array.from({ length: n }, (_, i) => i));

    for (const cells of LAYOUTS[format]) {
      const page = out.addPage([W, H]);
      for (const [row, col, num, rotated] of cells) {
        const idx = order[num - 1];
        if (idx === null || idx === undefined) continue; // hoja en blanco
        const ep = embedded[idx];
        const m = opts.margin;
        const s = Math.min((cw - 2 * m) / ep.width, (ch - 2 * m) / ep.height);
        const w = ep.width * s, h = ep.height * s;
        const x0 = col * cw + (cw - w) / 2;
        const y0 = H - (row + 1) * ch + (ch - h) / 2;
        if (rotated) page.drawPage(ep, { x: x0 + w, y: y0 + h, width: w, height: h, rotate: degrees(180) });
        else page.drawPage(ep, { x: x0, y: y0, width: w, height: h });
      }
      if (opts.guides) drawGuides(page, W, H, cw, ch, format, rgb);
    }
    return {
      bytes: await out.save(),
      info: { sourcePages: n, format, blanks: format - n, sheets: LAYOUTS[format].length, sheet: opts.sheet },
    };
  }

  function drawGuides(page, W, H, cw, ch, format, rgb) {
    const gray = rgb(0.6, 0.6, 0.6);
    const dash = { dashArray: [3, 3], thickness: 0.4, color: gray };
    for (let c = 1; c < 4; c++) page.drawLine({ start: { x: c * cw, y: 0 }, end: { x: c * cw, y: H }, ...dash });
    page.drawLine({ start: { x: 0, y: ch }, end: { x: W, y: ch }, ...dash });
    if (format === 8) { // corte central (entre pliegues 1 y 3)
      page.drawLine({ start: { x: cw, y: ch }, end: { x: 3 * cw, y: ch }, thickness: 1.2, color: rgb(0.85, 0.1, 0.1), dashArray: [6, 3] });
    }
  }

  return { SHEETS, LAYOUTS, chooseFormat, buildOrder, imposeFanzine };
});
