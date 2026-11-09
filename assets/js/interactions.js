/* hugo-word97: toolbar/menu actions, window states, status bar, code blocks. */
(function () {
  'use strict';
  var W97 = window.W97, d = document.documentElement;
  var article = document.querySelector('.doc__content') || document.querySelector('.page__body');
  var docName = (document.getElementById('titlebar-title') || {}).textContent || document.title;

  /* ---------- window states (minimize / restore / close) ---------- */
  var desktop = document.getElementById('desktop');
  function setDesktopInteractive(on) {
    if (!desktop) return;
    desktop.setAttribute('aria-hidden', String(!on));
    desktop.querySelectorAll('.desktop__icon, .taskbar__start, .taskbar__task').forEach(function (b) { b.tabIndex = on ? 0 : -1; });
    if (!on && window.W97CloseStart) W97CloseStart(false);
  }
  function winState(state) {
    d.classList.remove('win-min', 'win-closed');
    if (state === 'min' || state === 'closed') {
      d.classList.add('win-' + state);
      setDesktopInteractive(true);
      var target = desktop.querySelector(state === 'min' ? '.taskbar__task' : '.desktop__icon');
      if (target) target.focus();
    } else {
      setDesktopInteractive(d.classList.contains('win-restored'));
    }
    measure();
  }
  /* ---------- Start menu: Shut Down ---------- */
  function shutDown() {
    var scr = document.createElement('div');
    scr.className = 'shutdown';
    scr.setAttribute('role', 'alertdialog');
    scr.setAttribute('aria-label', 'Shut Down');
    scr.tabIndex = 0;
    scr.innerHTML = '<p>It\'s now safe to turn off<br>your computer.</p><small>Click or press any key to restart.</small>';
    document.body.appendChild(scr);
    scr.focus();
    function restart(e) { if (e) e.preventDefault(); location.reload(); }
    scr.addEventListener('click', restart);
    scr.addEventListener('keydown', restart);
  }
  function clock() {
    var c = document.getElementById('taskbar-clock');
    if (c) c.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  /* ---------- full screen ---------- */
  var fsBar;
  function fullscreen(on) {
    d.classList.toggle('fullscreen', on);
    if (on) {
      if (!fsBar) {
        fsBar = document.createElement('div');
        fsBar.className = 'window fs-bar';
        fsBar.innerHTML = '<div class="titlebar"><span class="titlebar__title">Full Screen</span></div><button type="button" class="btn" data-action="fullscreen-exit">Close Full Screen</button>';
        document.body.appendChild(fsBar);
      }
      fsBar.querySelector('button').focus();
      if (d.requestFullscreen) d.requestFullscreen().catch(function () {});
    } else if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(function () {});
    }
    measure();
  }
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && d.classList.contains('fullscreen')) fullscreen(false); });

  /* ---------- reading font / size / zoom ---------- */
  function setFont(v) { if (v && v !== 'georgia') { d.setAttribute('data-doc-font', v); W97.set('w97-font', v); } else { d.removeAttribute('data-doc-font'); W97.set('w97-font', null); } syncSelects(); }
  function setSize(v) { v = parseInt(v, 10) || 12; d.style.setProperty('--doc-pt', v); W97.set('w97-size', v === 12 ? null : String(v)); syncSelects(); }
  function setZoom(v) { v = parseInt(v, 10) || 100; d.style.setProperty('--doc-zoom', v / 100); W97.set('w97-zoom', v === 100 ? null : String(v)); syncSelects(); }
  function syncSelects() {
    var f = d.getAttribute('data-doc-font') || 'georgia';
    var s = W97.get('w97-size') || '12';
    var z = W97.get('w97-zoom') || '100';
    document.querySelectorAll('[data-action="font-family"]').forEach(function (el) { el.value = f; });
    document.querySelectorAll('[data-action="font-size"]').forEach(function (el) { el.value = s; });
    document.querySelectorAll('[data-action="zoom"]').forEach(function (el) { el.value = z; });
  }

  /* ---------- accessibility text size (same keys as the previous theme) ---------- */
  var A11Y = { min: 90, max: 150, step: 10 };
  function a11yScale(delta) {
    var cur = parseInt(W97.get('a11y-font-scale'), 10) || 100;
    cur = delta === 0 ? 100 : Math.max(A11Y.min, Math.min(A11Y.max, cur + delta * A11Y.step));
    d.style.fontSize = cur === 100 ? '' : cur + '%';
    W97.set('a11y-font-scale', cur === 100 ? null : String(cur));
    var out = document.getElementById('a11y-scale'); if (out) out.textContent = cur + '%';
  }

  /* ---------- word count ---------- */
  function wordCount() {
    var text = article ? article.innerText : '';
    var words = (text.match(/\S+/g) || []).length;
    var paras = article ? article.querySelectorAll('p, li').length : 0;
    var rows = [['Pages', pageInfo().total], ['Words', words.toLocaleString()], ['Characters (no spaces)', text.replace(/\s/g, '').length.toLocaleString()], ['Characters (with spaces)', text.length.toLocaleString()], ['Paragraphs', paras]];
    var dl = document.getElementById('wordcount-stats');
    dl.innerHTML = '';
    rows.forEach(function (r) { var dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = r[0]; dd.textContent = r[1]; dl.append(dt, dd); });
    W97.openDialog('dlg-wordcount');
  }

  /* ---------- WordArt gallery: restyle the home title ---------- */
  function renderWordArt(el, style) {
    var text = el.getAttribute('data-wordart-text') || el.textContent.trim();
    el.setAttribute('data-wordart-text', text);
    el.className = el.className.replace(/\bwordart--(?!title)\w+/g, '').trim() + ' wordart--' + style;
    el.setAttribute('data-wordart', style);
    el.textContent = '';
    var face = document.createElement('span');
    face.className = 'wordart__face';
    if (style === 'wave') {
      var sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = text; el.appendChild(sr);
      face.classList.add('wordart__face--letters'); face.setAttribute('aria-hidden', 'true');
      Array.from(text).forEach(function (c, i) {
        var s = document.createElement('span');
        if (c === ' ') { s.className = 'wordart__sp'; s.textContent = ' '; }
        else { s.className = 'wordart__ch'; s.style.setProperty('--i', i); s.setAttribute('data-text', c); s.textContent = c; }
        face.appendChild(s);
      });
    } else { face.setAttribute('data-text', text); face.textContent = text; }
    el.appendChild(face);
  }
  var titleEl = document.querySelector('[data-wordart-title]');
  var titleDefault = titleEl && titleEl.getAttribute('data-wordart');
  function wordartStyle(style) {
    W97.set('w97-wordart', style || null);
    if (titleEl) renderWordArt(titleEl, style || titleDefault);
    document.querySelectorAll('.wordart-gallery__tile').forEach(function (t) { t.setAttribute('aria-checked', String(t.getAttribute('data-value') === (style || titleDefault))); });
    if (!titleEl && style) W97.toast('WordArt style saved. See it on the home page.');
  }
  if (titleEl && W97.get('w97-wordart') && W97.get('w97-wordart') !== titleDefault) renderWordArt(titleEl, W97.get('w97-wordart'));

  /* ---------- action dispatcher ---------- */
  var actions = {
    minimize: function () { winState('min'); },
    maximize: function (el) {
      var restored = d.classList.toggle('win-restored');
      el.setAttribute('aria-label', restored ? 'Maximize' : 'Restore');
      el.setAttribute('data-tip', restored ? 'Maximize' : 'Restore');
      el.setAttribute('aria-pressed', String(!restored));
      setDesktopInteractive(restored);
      measure();
    },
    'restore-window': function () { winState('normal'); var t = document.getElementById('titlebar-title'); if (t) document.querySelector('.tbtn[data-action="minimize"]').focus(); },
    close: function () { W97.openDialog('dlg-close'); },
    'start-run': function () { W97.message('Windows cannot find \'C:\\WINDOWS\\FUN.EXE\'. Make sure you typed the name correctly, and then try again. (This is a website.)', 'error', 'Run'); },
    'start-shutdown': shutDown,
    save: function () { W97.message('This document is already saved. (It\'s a website - your changes were never going to stick anyway.)', 'info', 'Microsoft Word'); },
    print: function () { if (window.W97CloseMenus) W97CloseMenus(); setTimeout(function () { window.print(); }, 50); },
    properties: function () { W97.openDialog('dlg-properties'); },
    back: function () { history.back(); },
    forward: function () { history.forward(); },
    copy: function () {
      var sel = String(window.getSelection());
      if (!sel) { W97.message('Select some text in the document first, then choose Copy.', 'info'); return; }
      var done = function () { W97.toast('Copied to the Clipboard.'); };
      if (navigator.clipboard) navigator.clipboard.writeText(sel).then(done, function () { document.execCommand('copy'); done(); });
      else { document.execCommand('copy'); done(); }
    },
    'select-all': function () {
      var r = document.createRange(); r.selectNodeContents(article || document.body);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    },
    find: function () { var dlg = W97.openDialog('dlg-find'); if (dlg) { var q = dlg.querySelector('#find-q'); q.focus(); q.select(); } },
    hyperlink: function () { W97.openDialog('dlg-hyperlink'); },
    view: function (el) { W97.setView(el.getAttribute('data-value')); measure(); },
    toggle: function (el) {
      var name = el.getAttribute('data-pref');
      var on = W97.toggle(name);
      if (name === 'docmap' || name === 'ruler' || name.indexOf('tb-') === 0) measure();
      if (name === 'assistant' && window.W97Assistant) W97Assistant(on);
    },
    fullscreen: function () { fullscreen(true); },
    'fullscreen-exit': function () { fullscreen(false); },
    align: function (el) {
      var v = el.getAttribute('data-value');
      if (v === 'left') { d.removeAttribute('data-align'); W97.set('w97-align', null); } else { d.setAttribute('data-align', v); W97.set('w97-align', v); }
      W97.sync();
    },
    font: function () {
      var dlg = W97.openDialog('dlg-font');
      var f = dlg.querySelector('[name=font]'), s = dlg.querySelector('[name=size]');
      f.value = d.getAttribute('data-doc-font') || 'georgia';
      s.value = W97.get('w97-size') || '12';
      preview(); f.focus();
    },
    wordcount: wordCount,
    a11y: function () { a11yScale(NaN); W97.openDialog('dlg-a11y'); },
    'a11y-font': function (el) { a11yScale(parseInt(el.getAttribute('data-value'), 10)); },
    'a11y-reset': function () { a11yScale(0); ['contrast', 'underline'].forEach(function (n) { W97.toggle(n, false); }); },
    wordart: function () {
      W97.openDialog('dlg-wordart');
      var cur = W97.get('w97-wordart') || titleDefault || 'purple';
      document.querySelectorAll('.wordart-gallery__tile').forEach(function (t) { t.setAttribute('aria-checked', String(t.getAttribute('data-value') === cur)); });
    },
    'wordart-style': function (el) { wordartStyle(el.getAttribute('data-value')); },
    about: function () { W97.openDialog('dlg-about'); }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el || el.tagName === 'SELECT' || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    var fn = actions[el.getAttribute('data-action')];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('change', function (e) {
    var el = e.target, a = el.getAttribute && el.getAttribute('data-action');
    if (a === 'font-family') setFont(el.value);
    else if (a === 'font-size') setSize(el.value);
    else if (a === 'zoom') setZoom(el.value);
    else if (el.hasAttribute && el.hasAttribute('data-pref-input')) W97.toggle(el.getAttribute('data-pref-input'), el.checked);
    if (el.closest && el.closest('#font-form')) preview();
  });

  // Font dialog
  function preview() {
    var form = document.getElementById('font-form'); if (!form) return;
    var map = { times: '"Times New Roman", serif', arial: 'Arial, sans-serif', georgia: 'Georgia, serif', verdana: 'Verdana, sans-serif', courier: '"Courier New", monospace', comic: '"Comic Sans MS", cursive' };
    var p = document.getElementById('font-preview');
    p.style.fontFamily = map[form.font.value] || map.georgia;
    p.style.fontSize = (parseInt(form.size.value, 10) || 12) + 'pt';
  }
  var fontDlg = document.getElementById('dlg-font');
  if (fontDlg) fontDlg.addEventListener('close', function () {
    var form = document.getElementById('font-form');
    if (fontDlg.returnValue === 'ok') { setFont(form.font.value); setSize(form.size.value); }
    else if (fontDlg.returnValue === 'default') { setFont('georgia'); setSize(12); }
  });

  // Close dialog: Yes / No / Cancel
  var closeDlg = document.getElementById('dlg-close');
  if (closeDlg) closeDlg.addEventListener('close', function () {
    var v = closeDlg.returnValue;
    if (v === 'yes') { W97.toast('Saved! (Not really.)'); setTimeout(function () { winState('closed'); }, 400); }
    else if (v === 'no') winState('closed');
  });

  // Copy button state follows the selection
  document.addEventListener('selectionchange', function () {
    var has = !!String(window.getSelection());
    document.querySelectorAll('.js-needs-selection').forEach(function (b) { b.classList.toggle('is-disabled', !has); });
  });

  // Esc leaves full screen
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.classList.contains('fullscreen') && !document.querySelector('dialog[open]')) fullscreen(false); });

  /* ---------- code blocks: Win98 panel title + copy ---------- */
  document.querySelectorAll('.prose div.highlight, .prose > pre').forEach(function (block) {
    if (block.closest('.codeblock')) return;
    var code = block.querySelector('code');
    var lang = code && code.getAttribute('data-lang');
    var wrap = document.createElement('div');
    wrap.className = 'codeblock';
    wrap.innerHTML = '<div class="titlebar titlebar--inactive"><span class="titlebar__title"></span><button type="button" class="btn codeblock__copy">Copy</button></div>';
    wrap.querySelector('.titlebar__title').textContent = (lang ? lang + ' - ' : '') + 'Code';
    block.parentNode.insertBefore(wrap, block);
    wrap.appendChild(block);
    var btn = wrap.querySelector('.codeblock__copy');
    btn.setAttribute('aria-label', 'Copy ' + (lang || '') + ' code');
    btn.addEventListener('click', function () {
      var txt = (code || block).innerText;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
        btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
      }, function () { W97.message('Could not access the Clipboard.', 'warning'); });
    });
  });

  /* ---------- Document Map: highlight current heading ---------- */
  var mapLinks = Array.prototype.slice.call(document.querySelectorAll('.docmap a[href^="#"]'));

  /* ---------- status bar: Page n / Sec / At (from real geometry) ---------- */
  var page = document.getElementById('document');
  var PAGE_IN = 11, PX_IN = 96;
  function pageInfo() {
    if (!page) return { cur: 1, total: 1, at: 1 };
    var r = page.getBoundingClientRect();
    var total = Math.max(1, Math.ceil(r.height / (PAGE_IN * PX_IN)));
    var y = Math.max(0, (window.innerHeight * 0.33) - r.top);
    var cur = Math.min(total, Math.floor(y / (PAGE_IN * PX_IN)) + 1);
    var at = Math.max(1, (y % (PAGE_IN * PX_IN)) / PX_IN);
    return { cur: cur, total: total, at: at };
  }
  var sbPage = document.querySelector('[data-sb="page"]'), sbPages = document.querySelector('[data-sb="pages"]'), sbAt = document.querySelector('[data-sb="at"]');
  var ticking = false;
  function updateStatus() {
    ticking = false;
    var p = pageInfo();
    if (sbPage) sbPage.textContent = 'Page ' + p.cur;
    if (sbPages) sbPages.textContent = p.cur + '/' + p.total;
    if (sbAt) sbAt.textContent = 'At ' + p.at.toFixed(1) + '"';
    if (mapLinks.length) {
      var current = null;
      mapLinks.forEach(function (a) { var h = document.getElementById(decodeURIComponent(a.hash.slice(1))); if (h && h.getBoundingClientRect().top < window.innerHeight * 0.3) current = a; });
      mapLinks.forEach(function (a) { a.classList.toggle('is-current', a === current); });
    }
    document.dispatchEvent(new Event('w97:scroll'));
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(updateStatus); } }, { passive: true });

  /* ---------- measure chrome for sticky offsets ---------- */
  var chrome = document.getElementById('chrome'), status = document.getElementById('statusbar');
  function measure() {
    d.style.setProperty('--chrome-h', (chrome && chrome.offsetParent !== null && !d.classList.contains('fullscreen') ? chrome.offsetHeight : 0) + 'px');
    d.style.setProperty('--status-h', (status && status.offsetParent !== null && !d.classList.contains('fullscreen') ? status.offsetHeight : 0) + 'px');
    updateStatus();
  }
  if (window.ResizeObserver) { var ro = new ResizeObserver(measure); if (chrome) ro.observe(chrome); if (status) ro.observe(status); }
  window.addEventListener('resize', measure);
  W97.measure = measure;

  /* ---------- WordArt: replay the rainbow-wave hop on hover or tap ---------- */
  function replayHop(e) {
    var w = e.target.closest && e.target.closest('.wordart--rainbow-wave');
    if (!w || !w.getAnimations) return;
    var anims = w.getAnimations({ subtree: true });
    if (anims.some(function (a) { return a.playState === 'running'; })) return;
    anims.forEach(function (a) { a.cancel(); a.play(); });
  }
  document.addEventListener('mouseover', replayHop);
  document.addEventListener('click', replayHop);
  // Start the first hop when the heading is on screen, not at page load.
  var hops = document.querySelectorAll('.wordart--rainbow-wave');
  if (hops.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-inview'); io.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    hops.forEach(function (el) { io.observe(el); });
  } else {
    hops.forEach(function (el) { el.classList.add('is-inview'); });
  }

  syncSelects();
  W97.sync();
  measure();
  clock(); setInterval(clock, 30000);
})();
