const express = require('express');
const router = express.Router();
const ReporteController = require('../controllers/reporteController');
const AuthController = require('../controllers/authController');

// Todas las rutas requieren autenticación
router.use(AuthController.verifyToken);

// Solo admin puede ver reportes
router.use(AuthController.requireAdmin);

router.get('/ventas-diarias', ReporteController.ventasDiarias);
router.get('/productos-mas-vendidos', ReporteController.productosMasVendidos);
router.get('/cierre-caja', ReporteController.cierreCaja);
router.get('/inventario', ReporteController.inventario);
router.get('/financiero-mensual', ReporteController.financieroMensual);

module.exports = router;