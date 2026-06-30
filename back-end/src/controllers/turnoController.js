const Turno = require('../models/Turno');
const db = require('../config/database');

class TurnoController {
  // Iniciar turno
  static async iniciar(req, res) {
    try {
      const { tipo_turno, efectivo_inicial } = req.body;
      const empleado_id = req.user.id;

      // Validar tipo de turno
      if (!['mañana', 'noche'].includes(tipo_turno)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de turno inválido. Use "mañana" o "noche"'
        });
      }

      // Verificar horario según tipo de turno
      const ahora = new Date();
      const hora = ahora.getHours();
      
      if (tipo_turno === 'mañana' && (hora < 7 || hora >= 11)) {
        return res.status(400).json({
          success: false,
          message: 'El turno de mañana es de 7:00 AM a 11:00 AM'
        });
      }

      if (tipo_turno === 'noche' && (hora < 18 || hora >= 22)) {
        return res.status(400).json({
          success: false,
          message: 'El turno de noche es de 6:00 PM a 10:00 PM'
        });
      }

      // Verificar si ya tiene un turno activo hoy
      const fechaHoy = ahora.toISOString().split('T')[0];
      const turnoActivo = await Turno.findActivoByEmpleado(empleado_id, fechaHoy);

      if (turnoActivo) {
        return res.status(400).json({
          success: false,
          message: 'Ya tienes un turno activo hoy',
          data: turnoActivo
        });
      }

      // Crear turno
      const turnoData = {
        empleado_id,
        fecha: fechaHoy,
        tipo_turno,
        hora_inicio: ahora.toTimeString().split(' ')[0],
        efectivo_inicial: efectivo_inicial || 0
      };

      const turno = await Turno.create(turnoData);

      res.status(201).json({
        success: true,
        message: 'Turno iniciado exitosamente',
        data: turno
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al iniciar turno',
        error: error.message
      });
    }
  }

  // Cerrar turno
  static async cerrar(req, res) {
    try {
      const { id } = req.params;
      const { efectivo_final, observaciones } = req.body;

      // Verificar que el turno pertenece al empleado
      const turnoResult = await db.query(
        'SELECT * FROM turnos WHERE id = $1 AND empleado_id = $2',
        [id, req.user.id]
      );

      if (turnoResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Turno no encontrado o no te pertenece'
        });
      }

      if (turnoResult.rows[0].estado === 'cerrado') {
        return res.status(400).json({
          success: false,
          message: 'El turno ya está cerrado'
        });
      }

      // Cerrar turno
      const turno = await Turno.cerrarTurno(id, efectivo_final, observaciones);

      // Generar reporte de cierre
      const cierreCaja = await Turno.getCierreCaja(id);

      res.json({
        success: true,
        message: 'Turno cerrado exitosamente',
        data: {
          turno,
          cierre_caja: cierreCaja
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al cerrar turno',
        error: error.message
      });
    }
  }

  // Obtener turno activo
  static async getActivo(req, res) {
    try {
      const fechaHoy = new Date().toISOString().split('T')[0];
      const turno = await Turno.findActivoByEmpleado(req.user.id, fechaHoy);

      if (!turno) {
        return res.status(404).json({
          success: false,
          message: 'No tienes un turno activo hoy'
        });
      }

      res.json({
        success: true,
        data: turno
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener turno activo',
        error: error.message
      });
    }
  }

  // Obtener historial de turnos
  static async getHistorial(req, res) {
    try {
      const { fecha, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      const empleado_id = req.user.rol === 'admin' ? req.query.empleado_id : req.user.id;

      let query = `
        SELECT t.*, e.nombre_completo as empleado_nombre,
               COUNT(v.id) as total_ventas,
               COALESCE(SUM(v.total), 0) as total_ventas_monto
        FROM turnos t
        JOIN empleados e ON t.empleado_id = e.id
        LEFT JOIN ventas v ON t.id = v.turno_id AND v.estado = 'completada'
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (empleado_id) {
        query += ` AND t.empleado_id = $${paramCount}`;
        params.push(empleado_id);
        paramCount++;
      }

      if (fecha) {
        query += ` AND t.fecha = $${paramCount}`;
        params.push(fecha);
        paramCount++;
      }

      query += ` GROUP BY t.id, e.nombre_completo
                 ORDER BY t.fecha DESC, t.hora_inicio DESC
                 LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      
      params.push(limit, offset);

      const result = await db.query(query, params);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener historial de turnos',
        error: error.message
      });
    }
  }

  // Registrar retiro de caja
  static async registrarRetiro(req, res) {
    try {
      const { monto, tipo, motivo, descripcion } = req.body;
      const turno_id = req.params.turnoId;
      const autorizado_por = req.user.id;

      // Verificar que el turno está activo
      const turnoResult = await db.query(
        'SELECT * FROM turnos WHERE id = $1 AND estado = "abierto"',
        [turno_id]
      );

      if (turnoResult.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'El turno no está activo o no existe'
        });
      }

      // Registrar retiro
      const result = await db.query(
        `INSERT INTO retiros_caja (turno_id, monto, tipo, motivo, descripcion, autorizado_por)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [turno_id, monto, tipo, motivo, descripcion, autorizado_por]
      );

      res.status(201).json({
        success: true,
        message: 'Retiro registrado exitosamente',
        data: result.rows[0]
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al registrar retiro',
        error: error.message
      });
    }
  }
}

module.exports = TurnoController;