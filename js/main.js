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

  // Hero title equal-width auto-fit
  const heroBold = document.querySelector('.hero-title-bold');
  const heroThin = document.querySelector('.hero-title-thin');

  if (heroBold && heroThin) {
    const measureText = (el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getBoundingClientRect().width;
    };

    const equalizeHeroTitle = () => {
      // Reset inline overrides so we measure against CSS defaults
      heroBold.style.letterSpacing = '';
      heroThin.style.letterSpacing = '';

      const baseBoldLS = parseFloat(getComputedStyle(heroBold).letterSpacing) || 0;
      const baseThinLS = parseFloat(getComputedStyle(heroThin).letterSpacing) || 0;

      const boldW = measureText(heroBold);
      const thinW = measureText(heroThin);
      if (boldW === 0 || thinW === 0) return;

      // Don't push past the container — bail if either word already
      // fills (or overflows) the available width.
      const parent = heroBold.parentElement;
      const parentStyle = getComputedStyle(parent);
      const available = parent.clientWidth
        - parseFloat(parentStyle.paddingLeft)
        - parseFloat(parentStyle.paddingRight);
      const targetW = Math.max(boldW, thinW);
      if (targetW >= available - 1) return;

      const delta = boldW - thinW;
      if (Math.abs(delta) < 0.5) return;

      const narrower = delta > 0 ? heroThin : heroBold;
      const baseLS = delta > 0 ? baseThinLS : baseBoldLS;
      const len = narrower.textContent.length;
      if (len <= 1) return;

      // Iteratively converge on equal width
      let extra = Math.abs(delta) / len;
      for (let i = 0; i < 5; i++) {
        narrower.style.letterSpacing = (baseLS + extra) + 'px';
        const remaining = targetW - measureText(narrower);
        if (Math.abs(remaining) < 0.5) break;
        extra += remaining / len;
      }
    };

    equalizeHeroTitle();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(equalizeHeroTitle);
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(equalizeHeroTitle, 100);
    });
  }
});
