const express = require('express');
const router = express.Router();
const TurnoController = require('../controllers/turnoController');
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

// Empleados y admin pueden manejar turnos
router.use(isEmployeeOrAdmin);

router.post('/iniciar', TurnoController.iniciar);
router.post('/:id/cerrar', TurnoController.cerrar);
router.get('/activo', TurnoController.getActivo);
router.get('/historial', TurnoController.getHistorial);
router.post('/:turnoId/retiros', TurnoController.registrarRetiro);

module.exports = router;