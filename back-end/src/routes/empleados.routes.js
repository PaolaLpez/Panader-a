const express = require('express');
const router = express.Router();
const EmpleadoController = require('../controllers/empleadoController');
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

// Solo admin puede listar, crear y eliminar empleados
router.get('/', AuthController.requireAdmin, EmpleadoController.getAll);
router.get('/search', AuthController.requireAdmin, EmpleadoController.search);
router.post('/', AuthController.requireAdmin, EmpleadoController.create);
router.delete('/:id', AuthController.requireAdmin, EmpleadoController.delete);

router.get('/:id', isEmployeeOrAdmin, EmpleadoController.getById);
router.put('/:id', isEmployeeOrAdmin, EmpleadoController.update);

module.exports = router;