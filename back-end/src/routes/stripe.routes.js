const express = require('express');
const router = express.Router();
const StripeController = require('../controllers/stripeController');
const AuthController = require('../controllers/authController');

// Middleware para verificar si es empleado o admin
const isEmployeeOrAdmin = (req, res, next) => {
  if (req.user.rol === 'empleado' || req.user.rol === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requiere rol de empleado o administrador.'
    });
  }
};

router.use(AuthController.verifyToken);
router.use(isEmployeeOrAdmin);

router.post('/payment', StripeController.pay);

module.exports = router;
