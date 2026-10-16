const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username and password.',
      });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    const isMatch = user.verifyPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    // Save admin info into session
    req.session.admin = {
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
    };

    return res.json({
      success: true,
      message: 'Admin authentication successful.',
      admin: req.session.admin,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during login.',
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error logging out.',
      });
    }
    res.clearCookie('connect.sid');
    return res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  });
});

// GET /api/auth/check
router.get('/check', (req, res) => {
  if (req.session && req.session.admin) {
    return res.json({
      authenticated: true,
      admin: req.session.admin,
    });
  }
  return res.json({
    authenticated: false,
    admin: null,
  });
});

// GET /api/auth/demo-credentials (helpful for reviewers & beginner testing)
router.get('/demo-credentials', (req, res) => {
  return res.json({
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  });
});

module.exports = router;
