/* hugo-word97: decorative Win98 scrollbar mirroring the native page scroll (wide screens only). */
(function () {
  'use strict';
  var d = document.documentElement, bar = document.getElementById('vscroll');
  var track = document.getElementById('vscroll-track'), thumb = document.getElementById('vscroll-thumb');
  if (!bar || !track) return;
  var mq = window.matchMedia('(min-width: 600px) and (hover: hover) and (pointer: fine)');
  function enable() { d.classList.toggle('has-vscroll', mq.matches); if (window.W97 && W97.measure) W97.measure(); update(); }
  function maxScroll() { return Math.max(0, d.scrollHeight - window.innerHeight); }
  function update() {
    if (!d.classList.contains('has-vscroll')) return;
    var th = track.clientHeight, ms = maxScroll();
    var ratio = Math.min(1, window.innerHeight / d.scrollHeight);
    var h = Math.max(14, th * ratio);
    thumb.style.height = h + 'px';
    thumb.style.top = (ms ? (window.scrollY / ms) * (th - h) : 0) + 'px';
    thumb.style.display = ratio >= 1 ? 'none' : '';
  }
  document.addEventListener('w97:scroll', update);
  window.addEventListener('resize', update);
  mq.addEventListener ? mq.addEventListener('change', enable) : mq.addListener(enable);

  var repeat;
  function hold(fn) { fn(); clearInterval(repeat); var t = setTimeout(function () { repeat = setInterval(fn, 50); }, 350); window.addEventListener('pointerup', function up() { clearTimeout(t); clearInterval(repeat); window.removeEventListener('pointerup', up); }); }
  bar.addEventListener('pointerdown', function (e) {
    var b = e.target.closest('[data-scroll]');
    if (b) { e.preventDefault(); var dir = +b.getAttribute('data-scroll'); hold(function () { window.scrollBy(0, dir * 40); }); return; }
    var br = e.target.closest('[data-browse]');
    if (br) { e.preventDefault(); browse(+br.getAttribute('data-browse')); return; }
    if (e.target === thumb) {
      e.preventDefault();
      var startY = e.clientY, startScroll = window.scrollY, th = track.clientHeight - thumb.offsetHeight;
      thumb.setPointerCapture(e.pointerId);
      var move = function (ev) { window.scrollTo(0, startScroll + (ev.clientY - startY) / th * maxScroll()); };
      thumb.addEventListener('pointermove', move);
      thumb.addEventListener('pointerup', function () { thumb.removeEventListener('pointermove', move); }, { once: true });
      return;
    }
    if (e.target === track) {
      e.preventDefault();
      var dir2 = e.clientY < thumb.getBoundingClientRect().top ? -1 : 1;
      hold(function () { window.scrollBy(0, dir2 * (window.innerHeight * 0.85)); });
    }
  });
  // Word 97 "browse object" buttons: previous / next heading.
  function browse(dir) {
    if (!dir) { window.scrollTo(0, 0); return; }
    var hs = Array.prototype.slice.call(document.querySelectorAll('.page__body h2, .page__body h3'));
    var off = parseFloat(getComputedStyle(d).getPropertyValue('--chrome-h')) + 20;
    var target = dir > 0 ? hs.filter(function (h) { return h.getBoundingClientRect().top > off + 2; })[0]
                         : hs.filter(function (h) { return h.getBoundingClientRect().top < off - 2; }).pop();
    if (target) target.scrollIntoView({ block: 'start' }); else if (dir < 0) window.scrollTo(0, 0);
  }
  enable();
})();
