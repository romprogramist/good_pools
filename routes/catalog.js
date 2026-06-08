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

module.exports = router;
