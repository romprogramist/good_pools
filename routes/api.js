const router = require('express').Router();

router.get('/categories', function (req, res) { res.json([]); });
router.get('/models', function (req, res) { res.json([]); });
router.get('/portfolio', function (req, res) { res.json([]); });

module.exports = router;
