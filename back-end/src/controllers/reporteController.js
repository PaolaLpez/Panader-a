const db = require('../config/database');

class ReporteController {
  // Reporte de ventas diarias
  static async ventasDiarias(req, res) {
    try {
      const { fecha_inicio, fecha_fin } = req.query;
      
      const startDate = fecha_inicio || new Date().toISOString().split('T')[0];
      const endDate = fecha_fin || startDate;

      const result = await db.query(
        `SELECT * FROM ventas_diarias 
         WHERE fecha BETWEEN $1 AND $2
         ORDER BY fecha DESC`,
        [startDate, endDate]
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al generar reporte de ventas diarias',
        error: error.message
      });
    }
  }

  // Reporte de productos más vendidos
  static async productosMasVendidos(req, res) {
    try {
      const { fecha_inicio, fecha_fin, limite = 10 } = req.query;
      
      const startDate = fecha_inicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = fecha_fin || new Date().toISOString().split('T')[0];

      const result = await db.query(
        `SELECT * FROM productos_mas_vendidos 
         LIMIT $1`,
        [limite]
      );

      // Si la vista no existe, calcular manualmente
      if (result.rowCount === 0) {
        const manualResult = await db.query(
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
          [startDate, endDate, limite]
        );

        res.json({
          success: true,
          data: manualResult.rows
        });
      } else {
        res.json({
          success: true,
          data: result.rows
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al generar reporte de productos más vendidos',
        error: error.message
      });
    }
  }

  // Reporte de cierre de caja
  static async cierreCaja(req, res) {
    try {
      const { fecha } = req.query;
      const queryDate = fecha || new Date().toISOString().split('T')[0];

      const result = await db.query(
        `SELECT * FROM cierre_caja_turno 
         WHERE fecha = $1
         ORDER BY tipo_turno`,
        [queryDate]
      );

      // Si la vista no existe, calcular manualmente
      if (result.rowCount === 0) {
        const manualResult = await db.query(
          `SELECT 
            t.id,
            t.fecha,
            t.tipo_turno,
            e.nombre_completo as empleado,
            t.efectivo_inicial,
            COALESCE(SUM(v.total), 0) as ventas_totales,
            COALESCE(SUM(r.monto), 0) as retiros_totales,
            t.efectivo_final,
            (t.efectivo_inicial + COALESCE(SUM(v.total), 0) - COALESCE(SUM(r.monto), 0)) as efectivo_calculado
           FROM turnos t
           JOIN empleados e ON t.empleado_id = e.id
           LEFT JOIN ventas v ON t.id = v.turno_id AND v.estado = 'completada'
           LEFT JOIN retiros_caja r ON t.id = r.turno_id
           WHERE t.fecha = $1 AND t.estado = 'cerrado'
           GROUP BY t.id, t.fecha, t.tipo_turno, e.nombre_completo, t.efectivo_inicial, t.efectivo_final`,
          [queryDate]
        );

        res.json({
          success: true,
          data: manualResult.rows
        });
      } else {
        res.json({
          success: true,
          data: result.rows
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al generar reporte de cierre de caja',
        error: error.message
      });
    }
  }

  // Reporte de inventario
  static async inventario(req, res) {
    try {
      // Productos con bajo stock
      const bajoStock = await db.query(
        `SELECT p.*, cp.nombre as categoria_nombre
         FROM productos p
         LEFT JOIN categorias_pan cp ON p.categoria_id = cp.id
         WHERE p.stock_actual <= p.stock_minimo
           AND p.visible = true
         ORDER BY (p.stock_actual::FLOAT / p.stock_minimo) ASC`
      );

      // Productos más vendidos hoy
      const hoy = new Date().toISOString().split('T')[0];
      const masVendidosHoy = await db.query(
        `SELECT 
          dv.nombre_producto,
          dv.tipo_producto,
          SUM(dv.cantidad) as total_vendido
         FROM detalle_venta dv
         JOIN ventas v ON dv.venta_id = v.id
         WHERE DATE(v.creado_en) = $1
           AND v.estado = 'completada'
         GROUP BY dv.nombre_producto, dv.tipo_producto
         ORDER BY total_vendido DESC
         LIMIT 10`,
        [hoy]
      );

      // Estadísticas generales
      const stats = await db.query(
        `SELECT 
          (SELECT COUNT(*) FROM productos WHERE visible = true) as total_productos,
          (SELECT COUNT(*) FROM productos WHERE stock_actual <= stock_minimo AND visible = true) as productos_bajo_stock,
          (SELECT SUM(stock_actual) FROM productos WHERE visible = true) as total_piezas,
          (SELECT SUM(precio * stock_actual) FROM productos WHERE visible = true) as valor_inventario`
      );

      res.json({
        success: true,
        data: {
          bajo_stock: bajoStock.rows,
          mas_vendidos_hoy: masVendidosHoy.rows,
          estadisticas: stats.rows[0]
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al generar reporte de inventario',
        error: error.message
      });
    }
  }

  // Reporte financiero mensual
  static async financieroMensual(req, res) {
    try {
      const { año, mes } = req.query;
      const year = año || new Date().getFullYear();
      const month = mes || new Date().getMonth() + 1;

      // Ventas por día del mes
      const ventasPorDia = await db.query(
        `SELECT 
          DATE(creado_en) as fecha,
          COUNT(*) as total_ventas,
          SUM(total) as ingreso_total,
          SUM(pago_recibido) as recibido_total,
          SUM(cambio) as cambio_total
         FROM ventas
         WHERE EXTRACT(YEAR FROM creado_en) = $1
           AND EXTRACT(MONTH FROM creado_en) = $2
           AND estado = 'completada'
         GROUP BY DATE(creado_en)
         ORDER BY fecha`,
        [year, month]
      );

      // Métodos de pago
      const metodosPago = await db.query(
        `SELECT 
          metodo_pago,
          COUNT(*) as total_ventas,
          SUM(total) as monto_total
         FROM ventas
         WHERE EXTRACT(YEAR FROM creado_en) = $1
           AND EXTRACT(MONTH FROM creado_en) = $2
           AND estado = 'completada'
         GROUP BY metodo_pago`,
        [year, month]
      );

      // Totales del mes
      const totales = await db.query(
        `SELECT 
          COUNT(*) as total_ventas_mes,
          SUM(total) as ingreso_total_mes,
          AVG(total) as promedio_venta,
          MIN(total) as venta_minima,
          MAX(total) as venta_maxima
         FROM ventas
         WHERE EXTRACT(YEAR FROM creado_en) = $1
           AND EXTRACT(MONTH FROM creado_en) = $2
           AND estado = 'completada'`,
        [year, month]
      );

      res.json({
        success: true,
        data: {
          ventas_por_dia: ventasPorDia.rows,
          metodos_pago: metodosPago.rows,
          totales: totales.rows[0],
          periodo: `${month}/${year}`
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al generar reporte financiero',
        error: error.message
      });
    }
  }
}

module.exports = ReporteController;