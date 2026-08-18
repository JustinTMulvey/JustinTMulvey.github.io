/* ------------------------------------------------------------------
   card-gallery.js
   Wires up one research card: click / arrow / dot / keyboard on desktop,
   native scroll-snap swipe on mobile. Media and the left-hand text always
   change together.
   ------------------------------------------------------------------ */

window.CardGallery = function (card) {

  var slidesWrap = card.querySelector('.card__slides');
  var slides     = Array.prototype.slice.call(card.querySelectorAll('.card__slide'));
  var textPane   = card.querySelector('.card__slide-text');
  var dots       = Array.prototype.slice.call(card.querySelectorAll('.card__dot'));
  var prev       = card.querySelector('[data-dir="prev"]');
  var next       = card.querySelector('[data-dir="next"]');
  var counter    = card.querySelector('.card__counter');
  var hint       = card.querySelector('.card__hint');
  var media      = card.querySelector('.card__media');

  if (slides.length === 0) return;

  var index = 0;
  var touched = false;

  function isMobile() {
    return window.matchMedia('(max-width: 860px)').matches;
  }

  function renderText(slide) {
    var data = JSON.parse(slide.dataset.text || '{}');
    var html = '';

    if (data.title)   html += '<h3 class="card__slide-title">' + data.title + '</h3>';
    if (data.journal) {
      html += data.journal_link
        ? '<a class="card__slide-journal" href="' + data.journal_link +
          '" target="_blank" rel="noopener">' + data.journal + '</a>'
        : '<span class="card__slide-journal">' + data.journal + '</span>';
    }
    if (data.description) html += '<p class="card__slide-desc">' + data.description + '</p>';
    if (data.body_html)   html += '<div class="card__slide-desc">' + data.body_html + '</div>';

    if (data.extra && data.extra.length) {
      html += '<dl class="card__slide-credits">' +
        data.extra.map(function (f) {
          return '<div class="card__slide-credit">' +
                 '<dt>' + f.label + ':</dt><dd>' + f.value + '</dd>' +
                 '</div>';
        }).join('') +
      '</dl>';
    }

    textPane.classList.add('is-swapping');
    window.setTimeout(function () {
      textPane.innerHTML = html;
      textPane.classList.remove('is-swapping');
    }, 140);
  }

  function setVideoState() {
    slides.forEach(function (slide, i) {
      var video = slide.querySelector('video');
      if (!video) return;
      var active = i === index;
      video.dataset.active = active ? 'true' : 'false';
      if (active) {
        video.play().catch(function () { /* autoplay refused */ });
      } else {
        video.pause();
      }
    });
  }

  function go(n, scroll) {
    index = Math.max(0, Math.min(slides.length - 1, n));

    slides.forEach(function (s, i) {
      s.classList.toggle('is-active', i === index);
      s.setAttribute('aria-hidden', i === index ? 'false' : 'true');
    });

    dots.forEach(function (d, i) {
      d.classList.toggle('is-active', i === index);
      d.setAttribute('aria-selected', i === index ? 'true' : 'false');
    });

    if (counter) counter.textContent = (index + 1) + ' / ' + slides.length;
    if (prev) prev.disabled = index === 0;
    if (next) next.disabled = index === slides.length - 1;

    window.LazyMedia.hydrateWithin(slides[index]);
    renderText(slides[index]);
    setVideoState();

    if (scroll && isMobile()) {
      slidesWrap.scrollTo({ left: slides[index].offsetLeft, behavior: 'smooth' });
    }

    if (hint && !touched) {
      touched = true;
      hint.classList.add('is-hidden');
    }
  }

  /* --- desktop: click anywhere on the media advances ---------------- */

  media.addEventListener('click', function (event) {
    if (isMobile()) return;
    if (event.target.closest('button')) return;
    go(index === slides.length - 1 ? 0 : index + 1);
  });

  if (prev) prev.addEventListener('click', function () { go(index - 1); });
  if (next) next.addEventListener('click', function () { go(index + 1); });

  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () { go(i, true); });
  });

  /* --- keyboard ----------------------------------------------------- */

  media.setAttribute('tabindex', '0');
  media.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1, true); }
    if (event.key === 'ArrowLeft')  { event.preventDefault(); go(index - 1, true); }
  });

  /* --- mobile: follow native scroll-snap ---------------------------- */

  /* Slides load one at a time, so a swipe would otherwise drag an empty
     frame into view and only fill it once the scroll settled. Hydrating
     whatever overlaps the strip's viewport during the drag keeps the
     saving (nothing off-screen loads) without the blank frame. */
  function hydrateVisibleSlides() {
    var left = slidesWrap.scrollLeft;
    var right = left + slidesWrap.clientWidth;
    slides.forEach(function (s) {
      if (s.offsetLeft < right && s.offsetLeft + s.offsetWidth > left) {
        window.LazyMedia.hydrateWithin(s);
      }
    });
  }

  var scrollTimer;
  slidesWrap.addEventListener('scroll', function () {
    if (!isMobile()) return;
    hydrateVisibleSlides();
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(function () {
      var nearest = 0;
      var best = Infinity;
      slides.forEach(function (s, i) {
        var d = Math.abs(s.offsetLeft - slidesWrap.scrollLeft);
        if (d < best) { best = d; nearest = i; }
      });
      if (nearest !== index) go(nearest);
    }, 90);
  }, { passive: true });

  go(0);
};
