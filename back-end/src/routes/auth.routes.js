const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// Ruta pública: Login
router.post('/login', AuthController.login);

// Rutas protegidas
router.get('/profile', 
  AuthController.verifyToken,
  AuthController.getProfile
);

router.post('/change-password',
  AuthController.verifyToken,
  AuthController.changePassword
);

// Ruta para verificar token
router.get('/verify',
  AuthController.verifyToken,
  (req, res) => {
    res.json({
      success: true,
      message: 'Token válido',
      user: req.user
    });
  }
);

module.exports = router;