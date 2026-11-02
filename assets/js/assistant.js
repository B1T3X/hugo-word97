/* hugo-word97: paperclip assistant + cookie notice. */
(function () {
  'use strict';
  var W97 = window.W97, a = document.getElementById('assistant');
  var balloon = document.getElementById('assistant-balloon');
  var clip = a && a.querySelector('.assistant__clip');
  function show(on) {
    if (!a) return;
    a.hidden = !on;
    if (on) setBalloon(W97.get('w97-assistant-balloon') !== 'closed');
  }
  function setBalloon(open) {
    balloon.hidden = !open;
    clip.setAttribute('aria-expanded', String(open));
    W97.set('w97-assistant-balloon', open ? null : 'closed');
  }
  window.W97Assistant = function (on) { show(on); if (on) setBalloon(true); };
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]'); if (!el) return;
    var act = el.getAttribute('data-action');
    if (act === 'assistant-hide') { W97.toggle('assistant', false); show(false); }
    else if (act === 'assistant-balloon-close') { setBalloon(false); clip.focus(); }
    else if (act === 'assistant-balloon-open') setBalloon(balloon.hidden);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && a && !a.hidden && !balloon.hidden && a.contains(document.activeElement)) { setBalloon(false); clip.focus(); } });
  show(W97.is('assistant'));

  // Cookie notice: honours the previous theme's cookieconsent cookie too.
  var c = document.getElementById('cookie-notice');
  if (c) {
    var seen = W97.get('cookieconsent_status') || /(?:^|;\s*)cookieconsent_status=/.test(document.cookie);
    if (!seen) c.hidden = false;
    c.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="cookie-dismiss"]')) { W97.set('cookieconsent_status', 'dismiss'); c.hidden = true; }
    });
  }
})();
