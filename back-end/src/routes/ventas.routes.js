const express = require('express');
const router = express.Router();
const VentaController = require('../controllers/ventaController');
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

// Todas las rutas requieren autenticación
router.use(AuthController.verifyToken);

// Solo empleados y admin pueden manejar ventas
router.use(isEmployeeOrAdmin);

router.post('/', VentaController.create);
router.get('/', VentaController.getAll);
router.get('/:id', VentaController.getById);
router.post('/:id/cancelar', VentaController.cancel);

module.exports = router;