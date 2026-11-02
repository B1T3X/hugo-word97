/* hugo-word97: client-side search over /index.json (Edit > Find, /search/ page). */
(function () {
  'use strict';
  var W97 = window.W97, index = null, loading = null;
  function load() {
    if (index) return Promise.resolve(index);
    if (!loading) loading = fetch(document.documentElement.getAttribute('data-search-index')).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) { index = j; return j; });
    return loading;
  }
  function search(q) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return load().then(function (items) {
      return items.map(function (it) {
        var t = it.t.toLowerCase(), s = (it.s || '').toLowerCase(), g = (it.g || []).join(' ').toLowerCase(), c = (it.c || '').toLowerCase(), score = 0;
        for (var i = 0; i < terms.length; i++) {
          var w = terms[i], hit = 0;
          if (t.indexOf(w) > -1) hit += 10;
          if (g.indexOf(w) > -1) hit += 6;
          if (s.indexOf(w) > -1) hit += 4;
          if (c.indexOf(w) > -1) hit += 1;
          if (!hit) return null;
          score += hit;
        }
        return { it: it, score: score };
      }).filter(Boolean).sort(function (a, b) { return b.score - a.score || (b.it.d > a.it.d ? 1 : -1); }).map(function (r) { return r.it; });
    });
  }
  function render(list, results, status, q) {
    results.innerHTML = '';
    status.textContent = list.length ? list.length + (list.length === 1 ? ' document' : ' documents') + ' found for "' + q + '".' : 'Word has finished searching the blog. The search item was not found.';
    list.slice(0, 50).forEach(function (it) {
      var li = document.createElement('li'), a = document.createElement('a'), span = document.createElement('span'), meta = document.createElement('span');
      a.href = it.u;
      a.innerHTML = '<svg class="ico" width="16" height="16" aria-hidden="true"><use href="' + spriteURL() + '#i-word"/></svg>';
      span.textContent = it.t + '.doc';
      meta.className = 'find__hit-meta'; meta.textContent = (it.d || '') + (it.s ? ' - ' + it.s.slice(0, 90) + (it.s.length > 90 ? '...' : '') : '');
      span.appendChild(meta); a.appendChild(span); li.appendChild(a); results.appendChild(li);
    });
    results.hidden = !list.length;
  }
  function spriteURL() { var u = document.querySelector('.ico use'); return u ? u.getAttribute('href').split('#')[0] : ''; }
  function wire(form, input, results, status) {
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim(); if (!q) return;
      status.textContent = 'Searching...';
      search(q).then(function (list) { render(list, results, status, q); }, function () { status.textContent = 'The search index could not be loaded.'; });
    });
  }
  var dlgResults = document.getElementById('find-results');
  wire(document.getElementById('find-form'), document.getElementById('find-q'), dlgResults, document.getElementById('find-status'));
  // /search/ page
  var pf = document.getElementById('search-page-form');
  if (pf) {
    var out = document.createElement('ul'); out.className = 'listbox find__results find__results--page';
    document.getElementById('search-page-results').appendChild(out);
    var inp = document.getElementById('search-page-q'), st = document.getElementById('search-page-status');
    wire(pf, inp, out, st);
    var q = new URLSearchParams(location.search).get('q');
    if (q) { inp.value = q; pf.requestSubmit ? pf.requestSubmit() : pf.dispatchEvent(new Event('submit')); }
  }
})();
