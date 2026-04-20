document.addEventListener('DOMContentLoaded', () => {
  // Carousel — render categories from API, then attach arrow
  var categoryTrack = document.getElementById('categoryTrack');
  var arrow = document.querySelector('.carousel-arrow');

  if (categoryTrack && typeof DataSource !== 'undefined') {
    DataSource.getCategories().then(function (categories) {
      categoryTrack.innerHTML = categories.map(function (cat) {
        var parts = cat.label.split(' ');
        var boldPart = parts[0] || '';
        var thinPart = parts.slice(1).join(' ') || '';
        return (
          '<a href="models.html?category=' + cat.key + '" class="category-card">' +
            '<div class="card-image">' +
              '<img src="' + cat.image + '" alt="' + cat.label + '">' +
            '</div>' +
            '<div class="card-title">' +
              '<div class="card-title-bold">' + boldPart + '</div>' +
              '<div class="card-title-thin">' + thinPart + '</div>' +
            '</div>' +
            '<div class="card-dot"></div>' +
          '</a>'
        );
      }).join('');
    });
  }

  if (arrow) {
    var track = document.querySelector('.carousel-track');
    if (track) {
      var scrollAmount = 310;
      arrow.addEventListener('click', function () {
        var maxScroll = track.scrollWidth - track.clientWidth;
        if (track.scrollLeft >= maxScroll - 10) {
          track.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      });
    }
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

  // Catalog cards on home page: render from API
  var catGrid = document.getElementById('catGrid');
  if (catGrid && typeof DataSource !== 'undefined') {
    DataSource.getModels().then(function (models) {
      // Show first 3 composite models as featured cards + first custom model
      var composite = models.filter(function (m) { return m.category === 'composite'; });
      var featured = composite[0];
      var others = composite.slice(1, 3);
      var custom = models.find(function (m) { return m.category === 'custom'; });

      var html = '';

      // Featured card (first composite)
      if (featured) html += catalogCardHtml(featured, true);

      // Other composite cards
      others.forEach(function (m) { html += catalogCardHtml(m, false); });

      // Custom card (full width)
      if (custom) html += catalogCardHtml(custom, false, true);

      catGrid.innerHTML = html;
    });
  }

  function catalogCardHtml(m, isFeatured, isFullWidth) {
    var hasPhoto = m.gallery && m.gallery.length;
    var imgStyle = hasPhoto
      ? 'background-image:url(' + m.gallery[0] + ');background-size:cover;background-position:center;'
      : '';
    if (isFullWidth) imgStyle += 'min-height:300px;';

    var specsHtml = '';
    if (m.length_m && m.width_m && m.depth_m) {
      specsHtml =
        '<div class="pspec"><div class="pspec-val">' + m.length_m + '</div><div class="pspec-unit">длина, м</div></div>' +
        '<div class="pspec"><div class="pspec-val">' + m.width_m + '</div><div class="pspec-unit">ширина, м</div></div>' +
        '<div class="pspec"><div class="pspec-val">' + m.depth_m + '</div><div class="pspec-unit">глубина, м</div></div>';
    } else {
      specsHtml =
        '<div class="pspec"><div class="pspec-val">&infin;</div><div class="pspec-unit">длина</div></div>' +
        '<div class="pspec"><div class="pspec-val">&infin;</div><div class="pspec-unit">ширина</div></div>' +
        '<div class="pspec"><div class="pspec-val">&infin;</div><div class="pspec-unit">глубина</div></div>';
    }

    var sizeLabel = m.length_m && m.width_m
      ? m.length_m + ' &times; ' + m.width_m + ' м'
      : (m.specs || 'Любой размер');

    var priceLabel = m.price && m.price !== 'По проекту'
      ? m.price.replace(/^от\s*/, 'от<strong>') + ' &#8381;</strong>'
      : 'Цена<strong>По проекту</strong>';

    // Fix price — if it already contains ₽, don't add again
    if (m.price && m.price.indexOf('₽') !== -1) {
      priceLabel = m.price.replace(/^от\s*/, 'от<strong>') + '</strong>';
    } else if (m.price === 'По проекту') {
      priceLabel = 'Цена<strong>По проекту</strong>';
    }

    var link = 'models.html?category=' + m.category + '&model=' + m.id;

    return (
      '<a href="' + link + '" class="pcard' + (isFeatured ? ' featured' : '') + '"' + (isFullWidth ? ' style="grid-column:1/-1;"' : '') + '>' +
        '<div class="pcard-img" style="' + imgStyle + '">' +
          (m.badge ? '<div class="pcard-badge">' + m.badge + '</div>' : '') +
          '<div class="pcard-size">' + sizeLabel + '</div>' +
        '</div>' +
        '<div class="pcard-info">' +
          '<div class="pcard-name">' + m.name + '</div>' +
          '<div class="pcard-subtitle">' + (m.series || '') + '</div>' +
          '<div class="pcard-desc">' + (m.desc || '') + '</div>' +
          '<div class="pcard-specs">' + specsHtml + '</div>' +
          '<div class="pcard-bottom">' +
            '<div class="pcard-price">' + priceLabel + '</div>' +
            '<span class="btn-card">Подробнее</span>' +
          '</div>' +
        '</div>' +
      '</a>'
    );
  }
});
