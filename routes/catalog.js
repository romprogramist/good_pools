const router = require('express').Router();
const pool = require('../db/pool');
const { parsePrice } = require('../lib/price');

const BASE_URL = (process.env.SITE_URL || 'https://xn--80ablclk2abatqa7b6b2c.xn--p1ai').replace(/\/$/, '');

function absUrl(p) {
  if (!p) return '';
  return BASE_URL + (p.charAt(0) === '/' ? p : '/' + p);
}

function xmlEscape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Один бассейн по slug + его картинки. Возвращает null, если не найден.
async function getModelBySlug(slug) {
  const m = await pool.query(`
    SELECT m.id, m.slug, m.name, m.series, m.description, m.length_m, m.width_m,
           m.depth_m, m.specs_label, m.price, m.badge,
           c.key AS category, c.label AS category_label
    FROM models m JOIN categories c ON c.id = m.category_id
    WHERE m.slug = $1
  `, [slug]);
  if (!m.rows.length) return null;
  const model = m.rows[0];
  const imgs = await pool.query(
    'SELECT image_path FROM model_images WHERE model_id = $1 ORDER BY is_cover DESC, sort_order, id',
    [model.id]
  );
  model.gallery = imgs.rows.map(function (r) { return '/' + r.image_path; });
  return model;
}

// GET /pool/:slug — страница-карточка
router.get('/pool/:slug', async function (req, res) {
  try {
    const model = await getModelBySlug(req.params.slug);
    if (!model) {
      return res.status(404).render('pool', { notFound: true, model: null, jsonLd: null, baseUrl: BASE_URL });
    }
    const priceNum = parsePrice(model.price);
    const cover = model.gallery.length ? model.gallery[0] : null;
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: model.name,
      description: model.description || '',
      brand: { '@type': 'Brand', name: 'Хорошие Бассейны' }
    };
    if (cover) jsonLd.image = absUrl(cover);
    if (priceNum != null) {
      jsonLd.offers = {
        '@type': 'Offer',
        price: priceNum,
        priceCurrency: 'RUB',
        availability: 'https://schema.org/InStock',
        url: absUrl('/pool/' + model.slug)
      };
    }
    res.render('pool', {
      notFound: false,
      model: model,
      priceNum: priceNum,
      cover: cover,
      jsonLd: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      baseUrl: BASE_URL
    });
  } catch (err) {
    console.error('[catalog] /pool error', err);
    res.status(500).send('Server error');
  }
});

// Все бассейны + обложка для фида/sitemap.
async function getAllModelsForFeed() {
  const res = await pool.query(`
    SELECT m.slug, m.name, m.series, m.description, m.price,
           c.label AS category_label,
           (SELECT image_path FROM model_images mi
            WHERE mi.model_id = m.id ORDER BY is_cover DESC, sort_order, id LIMIT 1) AS cover
    FROM models m JOIN categories c ON c.id = m.category_id
    ORDER BY m.sort_order, m.id
  `);
  return res.rows;
}

// GET /feed.xml — товарный фид (Google Shopping XML) для Яндекс.Директа
router.get('/feed.xml', async function (req, res) {
  try {
    const rows = await getAllModelsForFeed();
    const items = rows.map(function (m) {
      const price = parsePrice(m.price);
      if (price == null) return ''; // без цены товар в фид не идёт
      const title = m.series ? (m.name + ' ' + m.series) : m.name;
      const link = absUrl('/pool/' + m.slug);
      const image = m.cover ? absUrl('/' + m.cover) : '';
      return [
        '    <item>',
        '      <g:id>' + xmlEscape(m.slug) + '</g:id>',
        '      <g:title>' + xmlEscape(title) + '</g:title>',
        '      <g:link>' + xmlEscape(link) + '</g:link>',
        image ? '      <g:image_link>' + xmlEscape(image) + '</g:image_link>' : '',
        '      <g:description>' + xmlEscape(m.description || title) + '</g:description>',
        '      <g:price>' + price + ' RUB</g:price>',
        '      <g:availability>in stock</g:availability>',
        '      <g:brand>Хорошие Бассейны</g:brand>',
        '      <g:product_type>' + xmlEscape(m.category_label) + '</g:product_type>',
        '    </item>'
      ].filter(Boolean).join('\n');
    }).filter(Boolean).join('\n');

    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n' +
      '  <channel>\n' +
      '    <title>Хорошие Бассейны</title>\n' +
      '    <link>' + xmlEscape(BASE_URL) + '</link>\n' +
      '    <description>Каталог бассейнов</description>\n' +
      items + '\n' +
      '  </channel>\n' +
      '</rss>\n';

    res.set('Content-Type', 'application/xml; charset=utf-8').send(xml);
  } catch (err) {
    console.error('[catalog] /feed.xml error', err);
    res.status(500).send('Server error');
  }
});

// GET /sitemap.xml — статические страницы + все карточки
router.get('/sitemap.xml', async function (req, res) {
  try {
    const rows = await getAllModelsForFeed();
    const staticPages = ['/', '/models.html', '/portfolio.html', '/catalog.html'];
    const urls = staticPages.map(function (p) { return absUrl(p); })
      .concat(rows.map(function (m) { return absUrl('/pool/' + m.slug); }));
    const body = urls.map(function (u) {
      return '  <url><loc>' + xmlEscape(u) + '</loc></url>';
    }).join('\n');
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      body + '\n' +
      '</urlset>\n';
    res.set('Content-Type', 'application/xml; charset=utf-8').send(xml);
  } catch (err) {
    console.error('[catalog] /sitemap.xml error', err);
    res.status(500).send('Server error');
  }
});

// GET /robots.txt — отдаём маршрутом (отдельный файл не задеплоился бы через rsync)
router.get('/robots.txt', function (req, res) {
  const txt = 'User-agent: *\nAllow: /\nSitemap: ' + BASE_URL + '/sitemap.xml\n';
  res.set('Content-Type', 'text/plain; charset=utf-8').send(txt);
});

module.exports = router;
