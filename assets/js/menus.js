/* hugo-word97: menu bars (WAI-ARIA menubar pattern; mouse, keyboard, touch). Word's and Paint's. */
(function () {
  'use strict';
  var closers = [];
  window.W97CloseMenus = function () { closers.forEach(function (c) { c(false); }); };
  ['menubar', 'paint-menubar'].forEach(function (id) { var bar = document.getElementById(id); if (bar) closers.push(menubar(bar)); });

  function menubar(bar) {
    var tops = Array.prototype.slice.call(bar.querySelectorAll('.menubar__btn'));
    var openBtn = null;

    function visibleTops() { return tops.filter(function (b) { return b.offsetParent !== null; }); }
    function items(menu) { return Array.prototype.slice.call(menu.querySelectorAll('.menu__item')); }
    function menuOf(btn) { return document.getElementById(btn.getAttribute('aria-controls')); }

    function setTabStop(btn) { tops.forEach(function (b) { b.tabIndex = b === btn ? 0 : -1; }); }

    function open(btn, focus) {
      if (openBtn && openBtn !== btn) close(false);
      var menu = menuOf(btn);
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      openBtn = btn;
      setTabStop(btn);
      if (window.W97) W97.sync();
      // keep dropdown on screen (desktop)
      menu.style.left = ''; menu.style.right = '';
      var r = menu.getBoundingClientRect();
      if (r.right > window.innerWidth - 4 && getComputedStyle(btn.parentNode).position !== 'static') { menu.style.left = 'auto'; menu.style.right = '0'; }
      var list = items(menu);
      if (focus === 'first' && list[0]) list[0].focus();
      else if (focus === 'last' && list.length) list[list.length - 1].focus();
    }

    function close(returnFocus) {
      if (!openBtn) return;
      var btn = openBtn;
      menuOf(btn).hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      openBtn = null;
      if (returnFocus) btn.focus();
    }

    function move(btn, delta, keepOpen) {
      var v = visibleTops(), i = v.indexOf(btn);
      var next = v[(i + delta + v.length) % v.length];
      setTabStop(next);
      if (keepOpen) open(next, 'first'); else next.focus();
    }

    tops.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (openBtn === btn) close(false); else open(btn, null);
      });
      btn.addEventListener('mouseenter', function () { if (openBtn && openBtn !== btn) { open(btn, null); btn.focus(); } });
      btn.addEventListener('keydown', function (e) {
        switch (e.key) {
          case 'ArrowDown': case 'Enter': case ' ': e.preventDefault(); open(btn, 'first'); break;
          case 'ArrowUp': e.preventDefault(); open(btn, 'last'); break;
          case 'ArrowRight': e.preventDefault(); move(btn, 1, !!openBtn); break;
          case 'ArrowLeft': e.preventDefault(); move(btn, -1, !!openBtn); break;
          case 'Escape': close(true); break;
          case 'Home': e.preventDefault(); visibleTops()[0].focus(); break;
          case 'End': e.preventDefault(); var v = visibleTops(); v[v.length - 1].focus(); break;
        }
      });
    });

    bar.addEventListener('keydown', function (e) {
      var item = e.target.closest('.menu__item');
      if (!item) return;
      var menu = item.closest('.menu'), list = items(menu), i = list.indexOf(item);
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); list[(i + 1) % list.length].focus(); break;
        case 'ArrowUp': e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); break;
        case 'Home': e.preventDefault(); list[0].focus(); break;
        case 'End': e.preventDefault(); list[list.length - 1].focus(); break;
        case 'ArrowRight': e.preventDefault(); move(openBtn, 1, true); break;
        case 'ArrowLeft': e.preventDefault(); move(openBtn, -1, true); break;
        case 'Escape': e.preventDefault(); close(true); break;
        case 'Tab': close(false); break;
        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            var k = e.key.toLowerCase();
            var hit = list.filter(function (el) { var u = el.querySelector('u'); return u && u.textContent.toLowerCase() === k; })[0];
            if (hit) { e.preventDefault(); hit.focus(); hit.click(); }
          }
      }
    });

    // Activate items: actions are handled by interactions.js; we just close.
    bar.addEventListener('click', function (e) {
      var item = e.target.closest('.menu__item');
      if (!item) return;
      if (item.getAttribute('aria-disabled') === 'true') { e.preventDefault(); return; }
      var btn = openBtn;
      close(false);
      if (btn && !item.hasAttribute('href')) btn.focus({ preventScroll: true });
    });

    document.addEventListener('pointerdown', function (e) { if (openBtn && !bar.contains(e.target)) close(false); });
    window.addEventListener('blur', function () { close(false); });
    return close;
  }
})();

/* hugo-word97: taskbar Start menu (menu button pattern). */
(function () {
  'use strict';
  var btn = document.getElementById('start-btn');
  var menu = document.getElementById('start-menu');
  if (!btn || !menu) return;
  function items() { return Array.prototype.slice.call(menu.querySelectorAll('.menu__item')); }
  function isOpen() { return !menu.hidden; }

  function open(focus) {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    var list = items();
    if (focus === 'first' && list[0]) list[0].focus();
    else if (focus === 'last' && list.length) list[list.length - 1].focus();
  }
  function close(returnFocus) {
    if (!isOpen()) return;
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (returnFocus) btn.focus();
  }
  window.W97CloseStart = close;

  btn.addEventListener('click', function (e) {
    if (isOpen()) close(false);
    // keyboard "click" (Enter/Space) lands on the first item; mouse just opens
    else open(e.detail === 0 ? 'first' : null);
  });
  btn.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp') { e.preventDefault(); open('last'); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); open('first'); }
    else if (e.key === 'Escape') close(true);
  });

  menu.addEventListener('keydown', function (e) {
    var list = items(), i = list.indexOf(e.target);
    if (i < 0) return;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); list[(i + 1) % list.length].focus(); break;
      case 'ArrowUp': e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); break;
      case 'Home': e.preventDefault(); list[0].focus(); break;
      case 'End': e.preventDefault(); list[list.length - 1].focus(); break;
      case 'Escape': e.preventDefault(); e.stopPropagation(); close(true); break;
      case 'Tab': close(false); break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          var k = e.key.toLowerCase();
          var hit = list.filter(function (el) { var u = el.querySelector('u'); return u && u.textContent.toLowerCase() === k; })[0];
          if (hit) { e.preventDefault(); hit.click(); }
        }
    }
  });
  // Item actions run in interactions.js (document listener); just close here.
  menu.addEventListener('click', function (e) { if (e.target.closest('.menu__item')) close(false); });
  menu.addEventListener('mouseover', function (e) { var it = e.target.closest('.menu__item'); if (it) it.focus({ preventScroll: true }); });

  document.addEventListener('pointerdown', function (e) { if (isOpen() && !menu.contains(e.target) && !btn.contains(e.target)) close(false); });
  window.addEventListener('blur', function () { close(false); });
})();
