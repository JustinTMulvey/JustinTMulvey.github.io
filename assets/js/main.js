/* ------------------------------------------------------------------
   main.js — small shared bits: footer year, links from data/links.json,
   contact page rendering.
   ------------------------------------------------------------------ */

(function () {

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* small line-icon set for the contact list + footer links — keyed by
     link label (lowercased), monochrome via currentColor so they follow
     the surrounding link's color/hover state automatically. */
  var ICONS = {
    'email': '<svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="4.5" width="15" height="11" rx="1.6"/><path d="M3 5.5l7 6 7-6"/></svg>',
    'google scholar': '<svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 8L10 4l8.5 4-8.5 4-8.5-4z"/><path d="M5.5 9.9v3.3c0 1.1 2 2 4.5 2s4.5-.9 4.5-2V9.9"/><path d="M17.3 8.4v4.6"/></svg>',
    'linkedin': '<svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.2" y="2.2" width="15.6" height="15.6" rx="3.2"/><line x1="6.4" y1="8.8" x2="6.4" y2="14"/><circle cx="6.4" cy="6" r="0.15" fill="currentColor" stroke="currentColor" stroke-width="1.9"/><path d="M9.6 14v-3.7c0-.95.85-1.5 1.75-1.5s1.75.6 1.75 1.7V14"/></svg>',
    'github': '<svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.2 5.3L2.5 10l4.7 4.7"/><path d="M12.8 5.3L17.5 10l-4.7 4.7"/></svg>',
    'orcid': '<svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="7.8"/><circle cx="7.1" cy="6.6" r="0.15" fill="currentColor" stroke="currentColor" stroke-width="1.8"/><line x1="7.1" y1="8.5" x2="7.1" y2="13.4"/><path d="M9.5 8.5h1.6c1.5 0 2.7.95 2.7 2.45s-1.2 2.45-2.7 2.45H9.5V8.5z"/></svg>'
  };

  function iconFor(label) {
    return ICONS[String(label || '').toLowerCase()] || '';
  }

  fetch('data/links.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) return;
      var links = data.links || [];

      /* footer */
      var footer = document.getElementById('footer-links');
      if (footer) {
        footer.innerHTML = links
          .filter(function (l) { return l.in_footer !== false; })
          .map(function (l) {
            return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' +
                   iconFor(l.label) + '<span>' + esc(l.label) + '</span></a>';
          }).join('');
      }

      /* publications page: point "Google Scholar" at the real profile */
      var scholar = document.getElementById('scholar-link');
      if (scholar) {
        var match = links.filter(function (l) {
          return /scholar/i.test(l.label);
        })[0];
        if (match) scholar.href = match.url;
      }

      /* contact page */
      var list = document.getElementById('contact-links');
      if (list) {
        list.innerHTML = links.map(function (l) {
          return '<li><a href="' + esc(l.url) + '"' +
                 (l.url.indexOf('mailto:') === 0 ? '' : ' target="_blank" rel="noopener"') +
                 '><span class="label">' + iconFor(l.label) + esc(l.label) + '</span>' +
                 '<span class="value">' + esc(l.display || l.url.replace(/^https?:\/\/(www\.)?|^mailto:/, '')) +
                 '</span></a></li>';
        }).join('');
      }
    })
    .catch(function (err) { console.error(err); });
})();
