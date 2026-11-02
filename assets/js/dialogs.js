/* hugo-word97: dialog helpers built on native <dialog> (focus trap, Esc, focus restore). */
(function () {
  'use strict';
  var W97 = window.W97;
  W97.openDialog = function (id) {
    var dlg = document.getElementById(id);
    if (!dlg || dlg.open) return dlg;
    if (window.W97CloseMenus) W97CloseMenus();
    dlg.returnValue = '';
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    W97.sync();
    return dlg;
  };
  W97.closeDialog = function (dlg, value) { if (dlg && dlg.open) dlg.close(value || ''); };
  W97.message = function (text, icon, title) {
    var dlg = document.getElementById('dlg-msg');
    if (!dlg) return;
    dlg.querySelector('#dlg-msg-d').textContent = text;
    dlg.querySelector('#dlg-msg-t').textContent = title || 'Microsoft Word';
    dlg.querySelector('.dialog__icon').setAttribute('data-icon', icon || 'info');
    W97.openDialog('dlg-msg');
  };
  W97.toast = function (text) {
    var t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  };
  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-close]');
    if (c) { var dlg = c.closest('dialog'); W97.closeDialog(dlg, 'cancel'); }
    // click on backdrop does nothing (Win98 modals are modal)
  });
  // Escape always closes the topmost dialog (search inputs would otherwise just clear themselves).
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = document.querySelectorAll('dialog[open]');
    if (open.length) { e.preventDefault(); W97.closeDialog(open[open.length - 1], 'cancel'); }
  }, true);
})();
