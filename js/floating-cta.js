(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var fab = document.querySelector('.floating-cta');
    if (!fab) return;

    var heroBtn = document.querySelector('.hero-cta-btn');
    if (!heroBtn || typeof IntersectionObserver === 'undefined') {
      fab.classList.add('is-visible');
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        fab.classList.toggle('is-visible', !entry.isIntersecting);
      });
    }, { threshold: 0 });

    io.observe(heroBtn);
  });
})();
