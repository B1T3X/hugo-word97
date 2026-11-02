/* hugo-word97: persisted preferences + UI state sync. Exposes window.W97. */
(function () {
  'use strict';
  var d = document.documentElement;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }

  // Boolean prefs: name -> [storage key, html class, value meaning "on", default]
  var BOOL = {
    dark: ['theme', 'dark', 'dark'],
    marks: ['w97-marks', 'show-marks', '1'],
    docmap: ['w97-docmap', 'show-docmap', '1'],
    contrast: ['a11y-contrast', 'a11y-high-contrast', '1'],
    underline: ['a11y-underline', 'a11y-underline-links', '1'],
    assistant: ['w97-assistant', null, 'on']
  };
  // Visibility prefs stored inverted (class hides).
  var SHOWN = { ruler: ['w97-ruler', 'hide-ruler'], 'tb-standard': ['w97-tb-standard', 'hide-tb-standard'], 'tb-formatting': ['w97-tb-formatting', 'hide-tb-formatting'] };

  var W97 = window.W97 = {
    get: get, set: set,
    is: function (name) {
      if (BOOL[name]) {
        var b = BOOL[name];
        if (b[1]) return d.classList.contains(b[1]);
        var v = get(b[0]);
        return v === null ? !!(window.W97_ASSISTANT_DEFAULT) : v === b[2];
      }
      if (SHOWN[name]) return !d.classList.contains(SHOWN[name][1]);
      return false;
    },
    toggle: function (name, force) {
      var on = typeof force === 'boolean' ? force : !W97.is(name);
      if (BOOL[name]) {
        var b = BOOL[name];
        if (b[1]) d.classList.toggle(b[1], on);
        set(b[0], on ? b[2] : (name === 'dark' ? 'light' : '0'));
      } else if (SHOWN[name]) {
        d.classList.toggle(SHOWN[name][1], !on);
        set(SHOWN[name][0], on ? null : '0');
      }
      document.dispatchEvent(new CustomEvent('w97:pref', { detail: { name: name, on: on } }));
      W97.sync();
      return on;
    },
    view: function () { return d.getAttribute('data-view') || 'page'; },
    setView: function (v) { d.setAttribute('data-view', v); set('w97-view', v === 'page' ? null : v); W97.sync(); },
    align: function () { return d.getAttribute('data-align') || 'left'; },
    // Reflect state on every control that declares data-pref.
    sync: function () {
      document.querySelectorAll('[data-pref]').forEach(function (el) {
        var name = el.getAttribute('data-pref'), val = el.getAttribute('data-value'), on;
        if (name === 'view') on = W97.view() === val;
        else if (name === 'align') on = W97.align() === val;
        else if (name === 'current') on = true;
        else on = W97.is(name);
        if (el.hasAttribute('aria-checked')) el.setAttribute('aria-checked', String(on));
        else el.setAttribute('aria-pressed', String(on));
      });
      document.querySelectorAll('[data-pref-input]').forEach(function (el) { el.checked = W97.is(el.getAttribute('data-pref-input')); });
    }
  };
})();
