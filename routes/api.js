const router = require('express').Router();
const pool = require('../db/pool');

// GET /api/categories
router.get('/categories', async function (req, res) {
  try {
    const result = await pool.query('SELECT key, label, image FROM categories ORDER BY sort_order, id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/models
router.get('/models', async function (req, res) {
  try {
    const result = await pool.query(`
      SELECT m.id, m.slug, m.name, c.key AS category, m.series, m.description AS desc,
             m.length_m, m.width_m, m.depth_m, m.specs_label,
             m.price, m.badge
      FROM models m
      JOIN categories c ON c.id = m.category_id
      ORDER BY m.sort_order, m.id
    `);

    const imageResult = await pool.query(`
      SELECT model_id, image_path, is_cover
      FROM model_images
      ORDER BY sort_order, id
    `);

    // Group images by model_id
    const imageMap = {};
    imageResult.rows.forEach(function (img) {
      if (!imageMap[img.model_id]) imageMap[img.model_id] = [];
      imageMap[img.model_id].push(img);
    });

    const models = result.rows.map(function (m) {
      const imgs = imageMap[m.id] || [];

      // Build specs string
      var specs;
      if (m.length_m && m.width_m && m.depth_m) {
        specs = m.length_m + ' · ' + m.width_m + ' · ' + m.depth_m + ' м';
      } else {
        specs = m.specs_label || '';
      }

      // Build gallery array
      var gallery = imgs.map(function (img) { return '/' + img.image_path; });

      var item = {
        id: m.slug,
        name: m.name,
        category: m.category,
        series: m.series,
        desc: m.desc,
        specs: specs,
        length_m: m.length_m ? parseFloat(m.length_m) : null,
        width_m: m.width_m ? parseFloat(m.width_m) : null,
        depth_m: m.depth_m || null,
        price: m.price,
        gallery: gallery
      };
      if (m.badge) item.badge = m.badge;
      return item;
    });

    res.json(models);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/portfolio
router.get('/portfolio', async function (req, res) {
  try {
    const result = await pool.query(`
      SELECT p.id, p.title, p.location, c.key AS category, p.size, p.year
      FROM portfolio p
      JOIN categories c ON c.id = p.category_id
      ORDER BY p.sort_order, p.id
    `);

    const imageResult = await pool.query(`
      SELECT portfolio_id, image_path, is_cover
      FROM portfolio_images
      ORDER BY sort_order, id
    `);

    const imageMap = {};
    imageResult.rows.forEach(function (img) {
      if (!imageMap[img.portfolio_id]) imageMap[img.portfolio_id] = [];
      imageMap[img.portfolio_id].push(img);
    });

    const works = result.rows.map(function (w) {
      const imgs = imageMap[w.id] || [];
      const coverImg = imgs.find(function (i) { return i.is_cover; }) || imgs[0];
      const gallery = imgs.map(function (i) { return '/' + i.image_path; });

      return {
        id: w.id,
        title: w.title,
        location: w.location,
        category: w.category,
        size: w.size,
        year: w.year,
        image: coverImg ? '/' + coverImg.image_path : null,
        gallery: gallery
      };
    });

    res.json(works);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/render-reality
router.get('/render-reality', async function (req, res) {
  try {
    var section = await pool.query('SELECT title, subtitle FROM rr_section LIMIT 1');
    if (!section.rows.length) return res.json(null);

    var slides = await pool.query(
      'SELECT caption_title, caption_meta, render_image, real_image FROM rr_slides ORDER BY sort_order, id'
    );

    res.json({
      title: section.rows[0].title,
      subtitle: section.rows[0].subtitle,
      slides: slides.rows.map(function (s) {
        return {
          title: s.caption_title,
          meta: s.caption_meta,
          render: '/' + s.render_image,
          real: '/' + s.real_image
        };
      })
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/showroom
router.get('/showroom', async function (req, res) {
  try {
    var result = await pool.query('SELECT * FROM showroom LIMIT 1');
    if (!result.rows.length) return res.json(null);
    var sr = result.rows[0];

    var imgs = await pool.query(
      'SELECT image_path, is_cover FROM showroom_images WHERE showroom_id = $1 ORDER BY sort_order, id',
      [sr.id]
    );
    var gallery = imgs.rows.map(function (i) { return '/' + i.image_path; });
    var cover = imgs.rows.find(function (i) { return i.is_cover; }) || imgs.rows[0];

    res.json({
      title: sr.title,
      description: sr.description,
      address: sr.address,
      image: cover ? '/' + cover.image_path : null,
      gallery: gallery
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
