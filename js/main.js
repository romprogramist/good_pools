document.addEventListener('DOMContentLoaded', () => {
  // Carousel
  const track = document.querySelector('.carousel-track');
  const arrow = document.querySelector('.carousel-arrow');

  if (track && arrow) {
    const scrollAmount = 310;
    arrow.addEventListener('click', () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= maxScroll - 10) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    });
  }

  // Hamburger menu
  const hamburger = document.querySelector('.hamburger');
  const menuOverlay = document.getElementById('menuOverlay');

  if (hamburger && menuOverlay) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      menuOverlay.classList.toggle('open');
      document.body.classList.toggle('menu-open');
    });

    // Close menu on link click
    menuOverlay.querySelectorAll('.menu-link').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        menuOverlay.classList.remove('open');
        document.body.classList.remove('menu-open');
      });
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuOverlay.classList.contains('open')) {
        hamburger.classList.remove('active');
        menuOverlay.classList.remove('open');
        document.body.classList.remove('menu-open');
      }
    });
  }
});
