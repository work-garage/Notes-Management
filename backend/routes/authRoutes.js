const express = require('express');
const authenticateCognito = require('../middleware/authenticateCognito');

const router = express.Router();

// GET /api/auth/me — return verified user identity
router.get('/me', authenticateCognito, (req, res) => {
  res.json({
    sub: req.user.sub,
    username: req.user.username,
    email: req.user.email,
  });
});

module.exports = router;
