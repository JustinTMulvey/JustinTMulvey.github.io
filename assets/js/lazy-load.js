/* ------------------------------------------------------------------
   lazy-load.js
   Media carries data-src instead of src. Nothing is fetched until the
   card scrolls near the viewport, and even then only the slide actually
   on show is fetched — the rest wait until the visitor navigates to
   them. With three multi-megabyte videos per card, loading a whole card
   up front costs roughly three times what the visitor is looking at.
   Video additionally only plays while it is the active slide AND on
   screen.
   ------------------------------------------------------------------ */

window.LazyMedia = (function () {

  var ROOT_MARGIN = '400px 0px';

  function hydrate(el) {
    if (el.dataset.src) {
      if (el.tagName === 'VIDEO') {
        var source = document.createElement('source');
        source.src = el.dataset.src;
        source.type = el.dataset.mime || '';
        el.appendChild(source);
        el.load();
      } else {
        el.src = el.dataset.src;
      }
      delete el.dataset.src;
    }
  }

  function hydrateAll(el) {
    el.querySelectorAll('[data-src]').forEach(hydrate);
  }

  /* Only the slide currently on show. Anything in the media pane that
     isn't part of the slide strip (a placeholder, say) still loads. */
  function hydrateShown(card) {
    var active = card.querySelector('.card__slide.is-active');
    if (!active) { hydrateAll(card); return; }
    hydrateAll(active);
    card.querySelectorAll('.card__media > [data-src]').forEach(hydrate);
  }

  /* Load the shown slide once its card approaches the viewport. */
  var loader = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          hydrateShown(entry.target);
          loader.unobserve(entry.target);
        });
      }, { rootMargin: ROOT_MARGIN })
    : null;

  /* Pause video that scrolls off screen; resume if it is still active. */
  var player = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var video = entry.target;
          if (entry.isIntersecting && video.dataset.active === 'true') {
            video.play().catch(function () { /* autoplay refused, fine */ });
          } else {
            video.pause();
          }
        });
      }, { threshold: 0.25 })
    : null;

  return {
    /* Call once per card element after it is in the DOM. */
    observe: function (card) {
      if (loader) {
        loader.observe(card);
      } else {
        hydrateShown(card);
      }
      if (player) {
        card.querySelectorAll('video').forEach(function (v) {
          player.observe(v);
        });
      }
    },

    /* Force-load a specific slide's media (used when a user jumps ahead). */
    hydrateWithin: function (el) {
      el.querySelectorAll('[data-src]').forEach(hydrate);
    }
  };
})();
