const Venta = require('../models/Venta');
const Producto = require('../models/Producto');
const db = require('../config/database');

class VentaController {
  // Crear nueva venta
  static async create(req, res) {
    try {
      const { productos, total, pago_recibido, metodo_pago = 'efectivo' } = req.body;
      const empleado_id = req.user.id;

      // Validaciones
      if (!productos || !Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere al menos un producto'
        });
      }

      if (!total || total <= 0 || !pago_recibido || pago_recibido <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Total y pago recibido son requeridos y mayores a 0'
        });
      }

      const cambio = pago_recibido - total;
      
      if (cambio < 0) {
        return res.status(400).json({
          success: false,
          message: 'El pago recibido es menor al total'
        });
      }

      // Validar productos y preparar detalles
      const detalles = [];
      let totalCalculado = 0;

      for (const item of productos) {
        if (!item.id || !item.cantidad || item.cantidad <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Cada producto debe tener ID y cantidad válida'
          });
        }

        let precio = 0;
        let nombre = '';
        let tipo_producto = '';

        // Buscar producto según tipo
        if (item.tipo === 'pan') {
          const producto = await Producto.findById(item.id);
          if (!producto) {
            return res.status(404).json({
              success: false,
              message: `Producto no encontrado: ${item.id}`
            });
          }

          if (producto.stock_actual < item.cantidad) {
            return res.status(400).json({
              success: false,
              message: `Stock insuficiente para ${producto.nombre}`
            });
          }

          precio = producto.precio;
          nombre = producto.nombre;
          tipo_producto = 'pan';

        } else if (item.tipo === 'refri') {
          const result = await db.query(
            'SELECT * FROM productos_refri WHERE id = $1',
            [item.id]
          );
          if (result.rowCount === 0) {
            return res.status(404).json({
              success: false,
              message: `Producto refri no encontrado: ${item.id}`
            });
          }
          precio = result.rows[0].precio;
          nombre = result.rows[0].nombre;
          tipo_producto = 'refri';

        } else if (item.tipo === 'tienda') {
          const result = await db.query(
            'SELECT * FROM productos_tienda WHERE id = $1',
            [item.id]
          );
          if (result.rowCount === 0) {
            return res.status(404).json({
              success: false,
              message: `Producto tienda no encontrado: ${item.id}`
            });
          }
          precio = result.rows[0].precio;
          nombre = result.rows[0].nombre;
          tipo_producto = 'tienda';
        }

        const subtotal = precio * item.cantidad;
        totalCalculado += subtotal;

        detalles.push({
          producto_id: item.id,
          tipo_producto,
          nombre_producto: nombre,
          cantidad: item.cantidad,
          precio_unitario: precio,
          subtotal
        });
      }

      // Verificar que el total coincida
      if (Math.abs(totalCalculado - total) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `El total no coincide: calculado ${totalCalculado}, recibido ${total}`
        });
      }

      // Obtener turno activo del empleado
      const fechaHoy = new Date().toISOString().split('T')[0];
      const turnoResult = await db.query(
        `SELECT id FROM turnos 
         WHERE empleado_id = $1 
           AND fecha = $2 
           AND estado = 'abierto'
         LIMIT 1`,
        [empleado_id, fechaHoy]
      );

      let turno_id = null;
      if (turnoResult.rowCount > 0) {
        turno_id = turnoResult.rows[0].id;
      }

      // Datos de la venta
      const ventaData = {
        total,
        pago_recibido,
        cambio,
        metodo_pago,
        turno_id
      };

      // Crear venta
      const venta = await Venta.create(ventaData, detalles);

      // Generar ticket (simulado por ahora)
      const ticket = {
        folio: venta.folio,
        fecha: venta.creado_en,
        productos: detalles,
        total: venta.total,
        pago_recibido: venta.pago_recibido,
        cambio: venta.cambio
      };

      res.status(201).json({
        success: true,
        message: 'Venta registrada exitosamente',
        data: {
          venta,
          ticket
        }
      });

    } catch (error) {
      console.error('Error en venta:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar venta',
        error: error.message
      });
    }
  }

  // Obtener ventas
  static async getAll(req, res) {
    try {
      const { fecha, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT v.*, 
               COUNT(dv.id) as total_productos,
               SUM(dv.cantidad) as total_piezas,
               e.nombre_completo as empleado_nombre
        FROM ventas v
        LEFT JOIN detalle_venta dv ON v.id = dv.venta_id
        LEFT JOIN turnos t ON v.turno_id = t.id
        LEFT JOIN empleados e ON t.empleado_id = e.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (fecha) {
        query += ` AND DATE(v.creado_en) = $${paramCount}`;
        params.push(fecha);
        paramCount++;
      }

      query += ` GROUP BY v.id, e.nombre_completo
                 ORDER BY v.creado_en DESC
                 LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      
      params.push(limit, offset);

      const result = await db.query(query, params);

      // Contar total
      let countQuery = 'SELECT COUNT(*) as total FROM ventas WHERE 1=1';
      const countParams = [];
      let countParamCount = 1;

      if (fecha) {
        countQuery += ` AND DATE(creado_en) = $${countParamCount}`;
        countParams.push(fecha);
      }

      const countResult = await db.query(countQuery, countParams);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(countResult.rows[0].total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener ventas',
        error: error.message
      });
    }
  }

  // Obtener venta por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const ventaData = await Venta.findById(id);

      if (!ventaData) {
        return res.status(404).json({
          success: false,
          message: 'Venta no encontrada'
        });
      }

      res.json({
        success: true,
        data: ventaData
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener venta',
        error: error.message
      });
    }
  }

  // Cancelar venta
  static async cancel(req, res) {
    try {
      const { id } = req.params;
      const { razon } = req.body;

      const result = await db.query(
        `UPDATE ventas 
         SET estado = 'cancelada', actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $1 AND estado = 'completada'
         RETURNING *`,
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Venta no encontrada o ya cancelada'
        });
      }

      // Devolver stock si es necesario
      const detalles = await db.query(
        'SELECT * FROM detalle_venta WHERE venta_id = $1',
        [id]
      );

      for (const detalle of detalles.rows) {
        if (detalle.tipo_producto === 'pan') {
          await db.query(
            `UPDATE productos 
             SET stock_actual = stock_actual + $1
             WHERE id = $2`,
            [detalle.cantidad, detalle.producto_id]
          );
        }
      }

      res.json({
        success: true,
        message: 'Venta cancelada exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al cancelar venta',
        error: error.message
      });
    }
  }
}

module.exports = VentaController;