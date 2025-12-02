const express = require('express');
const { validateRequest } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const { schemas } = require('@waterbills/shared');
const authController = require('../controllers/authController');

const router = express.Router();

// Login schema
const loginSchema = schemas.user.pick({
  email: true,
  password: true
});

// Register schema
const registerSchema = schemas.user.omit({
  password: true
}).extend({
  password: schemas.user.shape.password
});

// Profile update schema
const profileUpdateSchema = schemas.user.pick({
  name: true,
  email: true
}).partial();

// Public routes
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, validateRequest(profileUpdateSchema), authController.updateProfile);

module.exports = router;
