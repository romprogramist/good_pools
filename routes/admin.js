const router = require('express').Router();

router.get('/login', function (req, res) {
  res.send('login page - coming soon');
});

router.get('/', function (req, res) {
  res.send('admin dashboard - coming soon');
});

module.exports = router;
