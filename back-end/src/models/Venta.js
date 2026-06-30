const db = require('../config/database');

class Venta {
  static async create(ventaData, detalles) {
    const { total, pago_recibido, cambio, metodo_pago = 'efectivo', empleado_id } = ventaData;
    
    // Generar folio único
    const fecha = new Date();
    const folio = `V-${fecha.getFullYear()}${(fecha.getMonth()+1).toString().padStart(2, '0')}${fecha.getDate().toString().padStart(2, '0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    try {
      await db.query('BEGIN');

      // Crear venta
      const ventaResult = await db.query(
        `INSERT INTO ventas (folio, total, pago_recibido, cambio, metodo_pago)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [folio, total, pago_recibido, cambio, metodo_pago]
      );

      const venta = ventaResult.rows[0];

      // Crear detalles
      for (const detalle of detalles) {
        await db.query(
          `INSERT INTO detalle_venta (
            venta_id, producto_id, tipo_producto, 
            nombre_producto, cantidad, precio_unitario, subtotal
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            venta.id,
            detalle.producto_id,
            detalle.tipo_producto,
            detalle.nombre_producto,
            detalle.cantidad,
            detalle.precio_unitario,
            detalle.subtotal
          ]
        );

        // Actualizar stock si es producto de pan
        if (detalle.tipo_producto === 'pan') {
          await db.query(
            `UPDATE productos 
             SET stock_actual = stock_actual - $1
             WHERE id = $2`,
            [detalle.cantidad, detalle.producto_id]
          );
        }
      }

      await db.query('COMMIT');
      return venta;

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  static async findById(id) {
    const ventaResult = await db.query(
      'SELECT * FROM ventas WHERE id = $1',
      [id]
    );

    if (ventaResult.rowCount === 0) return null;

    const detallesResult = await db.query(
      'SELECT * FROM detalle_venta WHERE venta_id = $1 ORDER BY id',
      [id]
    );

    return {
      venta: ventaResult.rows[0],
      detalles: detallesResult.rows
    };
  }

  static async findByFecha(fecha, limit = 50) {
    const result = await db.query(
      `SELECT v.*, 
              COUNT(dv.id) as total_productos,
              SUM(dv.cantidad) as total_piezas
       FROM ventas v
       LEFT JOIN detalle_venta dv ON v.id = dv.venta_id
       WHERE DATE(v.creado_en) = $1
       GROUP BY v.id
       ORDER BY v.creado_en DESC
       LIMIT $2`,
      [fecha, limit]
    );
    return result.rows;
  }

  static async getVentasDiarias(fechaInicio, fechaFin) {
    const result = await db.query(
      `SELECT 
        DATE(creado_en) as fecha,
        COUNT(*) as total_ventas,
        SUM(total) as ingreso_total,
        SUM(pago_recibido) as recibido_total,
        SUM(cambio) as cambio_total
       FROM ventas
       WHERE DATE(creado_en) BETWEEN $1 AND $2
         AND estado = 'completada'
       GROUP BY DATE(creado_en)
       ORDER BY fecha DESC`,
      [fechaInicio, fechaFin]
    );
    return result.rows;
  }

  static async getProductosMasVendidos(fechaInicio, fechaFin, limit = 10) {
    const result = await db.query(
      `SELECT 
        dv.nombre_producto,
        dv.tipo_producto,
        SUM(dv.cantidad) as total_vendido,
        SUM(dv.subtotal) as ingreso_generado
       FROM detalle_venta dv
       JOIN ventas v ON dv.venta_id = v.id
       WHERE DATE(v.creado_en) BETWEEN $1 AND $2
         AND v.estado = 'completada'
       GROUP BY dv.nombre_producto, dv.tipo_producto
       ORDER BY total_vendido DESC
       LIMIT $3`,
      [fechaInicio, fechaFin, limit]
    );
    return result.rows;
  }
}

module.exports = Venta;