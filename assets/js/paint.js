/* hugo-word97: Paint. Aliased pixel drawing (like the real thing), undo, PNG save. */
(function () {
  'use strict';
  var win = document.getElementById('paint');
  if (!win) return;
  var W97 = window.W97;
  var canvas = document.getElementById('paint-canvas');
  var ctx = canvas.getContext('2d', { willReadFrequently: true });
  var wrap = document.getElementById('paint-wrap');
  var optsBox = document.getElementById('paint-options');
  var posOut = document.getElementById('paint-pos');
  var task = document.getElementById('paint-task');
  var MOBILE = window.matchMedia('(max-width: 599px)');

  var fg = '#000000', bg = '#ffffff';
  var tool = 'pencil', prevTool = 'pencil';
  var opt = { brush: 4, eraser: 8, airbrush: 9, line: 1, shapeFill: 'outline' };
  var started = false;

  /* ---------- window: open / minimize / close / drag ---------- */
  function setTask(visible) {
    if (!task) return;
    task.hidden = false;
    task.setAttribute('aria-pressed', String(visible));
  }
  function open() {
    var first = !started;
    win.hidden = false;
    setTask(true);
    if (first) start();
    canvas.focus({ preventScroll: true });
  }
  function minimize() { win.hidden = true; setTask(false); if (task) task.focus(); }
  function close() { win.hidden = true; if (task) { task.hidden = true; task.setAttribute('aria-pressed', 'false'); } }

  function start() {
    started = true;
    if (!MOBILE.matches) {
      var w = Math.min(640, window.innerWidth - 16), h = Math.min(480, window.innerHeight - 44);
      win.style.width = w + 'px'; win.style.height = h + 'px';
      win.style.left = Math.max(8, Math.round((window.innerWidth - w) / 2)) + 'px';
      win.style.top = Math.max(8, Math.round((window.innerHeight - 28 - h) / 3)) + 'px';
    }
    // Size the bitmap to the visible work area, once (Paint's canvas doesn't follow the window).
    var cs = getComputedStyle(wrap);
    var pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 4;
    canvas.width = Math.max(120, Math.floor(wrap.clientWidth - pad));
    canvas.height = Math.max(120, Math.floor(wrap.clientHeight - pad));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setTool('pencil');
    syncColors();
  }

  var drag = null;
  win.querySelector('[data-paint-drag]').addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || e.target.closest('button') || MOBILE.matches) return;
    var r = win.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  });
  win.querySelector('[data-paint-drag]').addEventListener('pointermove', function (e) {
    if (!drag) return;
    var x = Math.min(window.innerWidth - 60, Math.max(60 - win.offsetWidth, e.clientX - drag.dx));
    var y = Math.min(window.innerHeight - 48, Math.max(0, e.clientY - drag.dy));
    win.style.left = x + 'px'; win.style.top = y + 'px';
  });
  ['pointerup', 'pointercancel'].forEach(function (t) { win.querySelector('[data-paint-drag]').addEventListener(t, function () { drag = null; }); });

  /* ---------- undo / redo ---------- */
  var undos = [], redos = [], LIMIT = 20;
  function snapshot() { return ctx.getImageData(0, 0, canvas.width, canvas.height); }
  function checkpoint() { undos.push(snapshot()); if (undos.length > LIMIT) undos.shift(); redos = []; }
  function undo() { if (undos.length) { redos.push(snapshot()); ctx.putImageData(undos.pop(), 0, 0); } }
  function redo() { if (redos.length) { undos.push(snapshot()); ctx.putImageData(redos.pop(), 0, 0); } }

  /* ---------- pixel primitives (integer rects only: no antialiasing) ---------- */
  function square(x, y, s) { var o = Math.floor(s / 2); ctx.fillRect(x - o, y - o, s, s); }
  function disc(cx, cy, d) {
    if (d <= 2) { square(cx, cy, d); return; }
    var r = d / 2, left = cx - Math.floor(r), top = cy - Math.floor(r);
    for (var i = 0; i < d; i++) {
      var yy = i + 0.5 - r, half = Math.sqrt(Math.max(0, r * r - yy * yy));
      var a = Math.round(left + r - half), b = Math.round(left + r + half);
      if (b > a) ctx.fillRect(a, top + i, b - a, 1);
    }
  }
  function bresenham(x0, y0, x1, y1, plot) {
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for (;;) {
      plot(x0, y0);
      if (x0 === x1 && y0 === y1) return;
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // Horizontal span [a, b] (inclusive) of a shape on row y, or null.
  function span(kind, L, T, R, B, y) {
    if (y < T || y > B || R < L) return null;
    var W = R - L + 1, H = B - T + 1;
    if (kind === 'rect') return [L, R];
    if (kind === 'ellipse') {
      var cx = L + W / 2, cy = T + H / 2, t = (y + 0.5 - cy) / (H / 2);
      if (Math.abs(t) > 1) return null;
      var half = (W / 2) * Math.sqrt(1 - t * t);
      var a = Math.round(cx - half), b = Math.round(cx + half) - 1;
      return b < a ? [Math.round(cx - 0.5), Math.round(cx - 0.5)] : [a, b];
    }
    // rounded rectangle
    var r = Math.min(8, W / 2, H / 2), d = Math.min(y + 0.5 - T, B + 1 - (y + 0.5));
    if (d >= r) return [L, R];
    var inset = r - Math.sqrt(Math.max(0, r * r - (r - d) * (r - d)));
    return [Math.round(L + inset), Math.round(R + 1 - inset) - 1];
  }
  function shape(kind, L, T, R, B, lw, outline, fill) {
    var y, o, i;
    if (fill) {
      // Fill the whole shape; the outline (if any) is drawn on top.
      ctx.fillStyle = fill;
      for (y = T; y <= B; y++) { o = span(kind, L, T, R, B, y); if (o) ctx.fillRect(o[0], y, o[1] - o[0] + 1, 1); }
    }
    if (!outline) return;
    ctx.fillStyle = outline;
    for (y = T; y <= B; y++) {
      o = span(kind, L, T, R, B, y);
      if (!o) continue;
      i = span(kind, L + lw, T + lw, R - lw, B - lw, y);
      if (!i || i[0] > i[1]) { ctx.fillRect(o[0], y, o[1] - o[0] + 1, 1); continue; }
      // Keep the outline connected where the curve steps more than a pixel between rows.
      var up = span(kind, L, T, R, B, y - 1), dn = span(kind, L, T, R, B, y + 1);
      var la = Math.max(i[0] - 1, (up ? up[0] : o[0]) - 1, (dn ? dn[0] : o[0]) - 1);
      var rb = Math.min(i[1] + 1, (up ? up[1] : o[1]) + 1, (dn ? dn[1] : o[1]) + 1);
      la = Math.min(la, Math.floor((o[0] + o[1]) / 2)); rb = Math.max(rb, la + 1);
      ctx.fillRect(o[0], y, la - o[0] + 1, 1);
      ctx.fillRect(rb, y, o[1] - rb + 1, 1);
    }
  }

  function hexToRgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function floodFill(x, y, color) {
    var W = canvas.width, H = canvas.height, img = ctx.getImageData(0, 0, W, H), d = img.data;
    var i = (y * W + x) * 4, t = [d[i], d[i + 1], d[i + 2], d[i + 3]], c = hexToRgb(color);
    if (t[0] === c[0] && t[1] === c[1] && t[2] === c[2] && t[3] === 255) return;
    function match(p) { return d[p] === t[0] && d[p + 1] === t[1] && d[p + 2] === t[2] && d[p + 3] === t[3]; }
    var stack = [[x, y]];
    while (stack.length) {
      var pt = stack.pop(), px = pt[0], py = pt[1];
      while (px > 0 && match((py * W + px - 1) * 4)) px--;
      var above = false, below = false;
      for (; px < W && match((py * W + px) * 4); px++) {
        var p = (py * W + px) * 4;
        d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 255;
        if (py > 0) { var ua = match(((py - 1) * W + px) * 4); if (ua && !above) stack.push([px, py - 1]); above = ua; }
        if (py < H - 1) { var ub = match(((py + 1) * W + px) * 4); if (ub && !below) stack.push([px, py + 1]); below = ub; }
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  function pickAt(x, y) {
    var d = ctx.getImageData(x, y, 1, 1).data;
    return '#' + [d[0], d[1], d[2]].map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }

  /* ---------- tools ---------- */
  var OPTIONS = {
    brush: { key: 'brush', values: [2, 4, 7], kind: 'dot' },
    eraser: { key: 'eraser', values: [4, 6, 8, 10], kind: 'square' },
    airbrush: { key: 'airbrush', values: [5, 9, 14], kind: 'spray' },
    line: { key: 'line', values: [1, 2, 3, 4, 5], kind: 'width' },
    rect: { key: 'shapeFill', values: ['outline', 'both', 'fill'], kind: 'fill' },
    ellipse: { key: 'shapeFill', values: ['outline', 'both', 'fill'], kind: 'fill' },
    roundrect: { key: 'shapeFill', values: ['outline', 'both', 'fill'], kind: 'fill' }
  };
  var OPT_LABEL = { dot: 'Brush size ', square: 'Eraser size ', spray: 'Spray size ', width: 'Line width ', fill: '' };
  var FILL_LABEL = { outline: 'Outline', both: 'Outline and fill', fill: 'Fill' };
  function renderOptions() {
    optsBox.textContent = '';
    var o = OPTIONS[tool];
    if (!o) return;
    o.values.forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'paint__opt paint__opt--' + o.kind;
      b.setAttribute('aria-pressed', String(opt[o.key] === v));
      b.setAttribute('aria-label', o.kind === 'fill' ? FILL_LABEL[v] : OPT_LABEL[o.kind] + v);
      var g = document.createElement('span');
      g.className = 'paint__glyph';
      if (o.kind === 'fill') g.setAttribute('data-fill', v);
      else g.style.setProperty('--s', (o.kind === 'spray' ? Math.round(v * 0.9) : v) + 'px');
      b.appendChild(g);
      b.addEventListener('click', function () { opt[o.key] = v; renderOptions(); });
      optsBox.appendChild(b);
    });
  }
  function setTool(t) {
    if (t !== 'picker') prevTool = t;
    tool = t;
    win.setAttribute('data-tool', t);
    win.querySelectorAll('.paint__tool').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-tool') === t)); });
    renderOptions();
  }
  win.querySelector('.paint__tools').addEventListener('click', function (e) {
    var b = e.target.closest('.paint__tool');
    if (b) setTool(b.getAttribute('data-tool'));
  });

  /* ---------- colors ---------- */
  function syncColors() {
    document.getElementById('paint-fg').style.background = fg;
    document.getElementById('paint-bg').style.background = bg;
  }
  var palette = win.querySelector('.paint__palette');
  palette.addEventListener('click', function (e) { var s = e.target.closest('.paint__swatch'); if (s) { fg = s.getAttribute('data-color'); syncColors(); } });
  palette.addEventListener('contextmenu', function (e) { var s = e.target.closest('.paint__swatch'); if (s) { e.preventDefault(); bg = s.getAttribute('data-color'); syncColors(); } });

  /* ---------- drawing ---------- */
  var stroke = null, sprayTimer = null;
  function point(e) {
    var r = canvas.getBoundingClientRect();
    return [Math.floor((e.clientX - r.left) * canvas.width / r.width), Math.floor((e.clientY - r.top) * canvas.height / r.height)];
  }
  function spray() {
    if (!stroke) return;
    var rad = opt.airbrush;
    ctx.fillStyle = stroke.color;
    for (var n = 0; n < rad; n++) {
      var a = Math.random() * 2 * Math.PI, d = Math.random() * rad;
      ctx.fillRect(Math.round(stroke.x + Math.cos(a) * d), Math.round(stroke.y + Math.sin(a) * d), 1, 1);
    }
  }
  function freehand(x0, y0, x1, y1) {
    ctx.fillStyle = stroke.color;
    if (tool === 'pencil') bresenham(x0, y0, x1, y1, function (x, y) { ctx.fillRect(x, y, 1, 1); });
    else if (tool === 'brush') bresenham(x0, y0, x1, y1, function (x, y) { disc(x, y, opt.brush); });
    else if (tool === 'eraser') bresenham(x0, y0, x1, y1, function (x, y) { square(x, y, opt.eraser); });
  }
  function drawShape(x, y, constrain) {
    ctx.putImageData(stroke.base, 0, 0);
    var x0 = stroke.sx, y0 = stroke.sy;
    if (tool === 'line') {
      if (constrain) {
        var dx = x - x0, dy = y - y0, adx = Math.abs(dx), ady = Math.abs(dy);
        if (adx > 2 * ady) y = y0; else if (ady > 2 * adx) x = x0; else { var m = Math.max(adx, ady); x = x0 + Math.sign(dx) * m; y = y0 + Math.sign(dy) * m; }
      }
      ctx.fillStyle = stroke.color;
      bresenham(x0, y0, x, y, function (px, py) { square(px, py, opt.line); });
      return;
    }
    if (constrain) { var s = Math.max(Math.abs(x - x0), Math.abs(y - y0)); x = x0 + (x < x0 ? -s : s); y = y0 + (y < y0 ? -s : s); }
    var L = Math.min(x0, x), T = Math.min(y0, y), R = Math.max(x0, x), B = Math.max(y0, y);
    var f = opt.shapeFill;
    shape(tool, L, T, R, B, opt.line, f === 'fill' ? null : stroke.color, f === 'outline' ? null : (f === 'both' ? stroke.alt : stroke.color));
  }

  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  canvas.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 && e.button !== 2) return;
    e.preventDefault();
    canvas.focus({ preventScroll: true });
    var p = point(e), right = e.button === 2;
    var color = right ? bg : fg, alt = right ? fg : bg;
    if (tool === 'picker') {
      if (right) bg = pickAt(p[0], p[1]); else fg = pickAt(p[0], p[1]);
      syncColors(); setTool(prevTool); return;
    }
    checkpoint();
    if (tool === 'fill') {
      if (p[0] >= 0 && p[1] >= 0 && p[0] < canvas.width && p[1] < canvas.height) floodFill(p[0], p[1], color);
      return;
    }
    canvas.setPointerCapture(e.pointerId);
    stroke = { sx: p[0], sy: p[1], x: p[0], y: p[1], color: tool === 'eraser' ? bg : color, alt: alt, base: (tool === 'line' || (OPTIONS[tool] && OPTIONS[tool].kind === 'fill')) ? snapshot() : null };
    if (tool === 'airbrush') { spray(); sprayTimer = setInterval(spray, 30); }
    else if (stroke.base) drawShape(p[0], p[1], e.shiftKey);
    else freehand(p[0], p[1], p[0], p[1]);
  });
  canvas.addEventListener('pointermove', function (e) {
    var p = point(e);
    posOut.textContent = p[0] >= 0 && p[1] >= 0 && p[0] < canvas.width && p[1] < canvas.height ? p[0] + ',' + p[1] : '';
    if (!stroke) return;
    if (tool === 'airbrush') { stroke.x = p[0]; stroke.y = p[1]; return; }
    if (stroke.base) drawShape(p[0], p[1], e.shiftKey);
    else freehand(stroke.x, stroke.y, p[0], p[1]);
    stroke.x = p[0]; stroke.y = p[1];
  });
  function endStroke() { stroke = null; clearInterval(sprayTimer); }
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
  canvas.addEventListener('pointerleave', function () { posOut.textContent = ''; });

  /* ---------- menu commands ---------- */
  function save() {
    canvas.toBlob(function (blob) {
      if (!blob) return;
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'untitled.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }, 'image/png');
  }
  function clearTo(color) { checkpoint(); ctx.fillStyle = color; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  function invert() {
    checkpoint();
    var img = snapshot(), d = img.data;
    for (var i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; }
    ctx.putImageData(img, 0, 0);
  }
  var commands = {
    'start-paint': open,
    'paint-task': function () { if (win.hidden) open(); else minimize(); },
    'paint-minimize': minimize,
    'paint-close': close,
    'paint-new': function () { clearTo('#ffffff'); },
    'paint-save': save,
    'paint-undo': undo,
    'paint-redo': redo,
    'paint-invert': invert,
    'paint-clear': function () { clearTo(bg); },
    'paint-about': function () { W97.message('Paint, Version 4.10.1998. It can\'t open your files, but File > Save gives you a PNG.', 'info', 'About Paint'); }
  };
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el || el.getAttribute('aria-disabled') === 'true') return;
    var fn = commands[el.getAttribute('data-action')];
    if (fn) { e.preventDefault(); fn(); }
  });

  win.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    var k = e.key.toLowerCase(), fn = null;
    if (k === 'z') fn = e.shiftKey ? redo : undo;
    else if (k === 'y') fn = redo;
    else if (k === 's') fn = save;
    else if (k === 'i') fn = invert;
    if (fn) { e.preventDefault(); fn(); }
  });
})();
