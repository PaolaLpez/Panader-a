const express = require('express');
const router = express.Router();
const ProductoController = require('../controllers/productoController');
const AuthController = require('../controllers/authController');

// Rutas públicas
router.get('/', ProductoController.getAll);
router.get('/search', ProductoController.search);
router.get('/categorias', ProductoController.getCategorias);
router.get('/refri', ProductoController.getRefri);
router.get('/tienda', ProductoController.getTienda);
router.get('/:id', ProductoController.getById);

// Rutas protegidas (solo admin)
router.post('/', 
  AuthController.verifyToken,
  AuthController.requireAdmin,
  ProductoController.create
);

router.put('/:id',
  AuthController.verifyToken,
  AuthController.requireAdmin,
  ProductoController.update
);

router.patch('/:id/toggle-visibility',
  AuthController.verifyToken,
  AuthController.requireAdmin,
  ProductoController.toggleVisibility
);

module.exports = router;