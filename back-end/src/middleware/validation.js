const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array()
    });
  }
  next();
};

const empleadoValidations = [
  body('nombre_completo').notEmpty().withMessage('Nombre completo es requerido'),
  body('fecha_nacimiento').isISO8601().withMessage('Fecha de nacimiento inválida'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres'),
  handleValidationErrors
];

const productoValidations = [
  body('nombre').notEmpty().withMessage('Nombre es requerido'),
  body('precio').isFloat({ min: 0 }).withMessage('Precio debe ser mayor a 0'),
  body('tipo_pan').isIn(['migajon', 'feite']).withMessage('Tipo de pan inválido'),
  handleValidationErrors
];

const ventaValidations = [
  body('productos').isArray({ min: 1 }).withMessage('Se requiere al menos un producto'),
  body('total').isFloat({ min: 0 }).withMessage('Total inválido'),
  body('pago_recibido').isFloat({ min: 0 }).withMessage('Pago recibido inválido'),
  handleValidationErrors
];

const turnoValidations = [
  body('tipo_turno').isIn(['mañana', 'noche']).withMessage('Tipo de turno inválido'),
  body('efectivo_inicial').optional().isFloat({ min: 0 }).withMessage('Efectivo inicial inválido'),
  handleValidationErrors
];

module.exports = {
  empleadoValidations,
  productoValidations,
  ventaValidations,
  turnoValidations,
  handleValidationErrors
};