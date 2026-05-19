const db = require('../config/database');

class Turno {
  static async create(turnoData) {
    const {
      empleado_id,
      fecha,
      tipo_turno,
      hora_inicio,
      efectivo_inicial = 0
    } = turnoData;

    const result = await db.query(
      `INSERT INTO turnos (
        empleado_id, fecha, tipo_turno, hora_inicio, efectivo_inicial, estado
      ) VALUES ($1, $2, $3, $4, $5, 'abierto')
      RETURNING *`,
      [empleado_id, fecha, tipo_turno, hora_inicio, efectivo_inicial]
    );
    return result.rows[0];
  }

  static async cerrarTurno(turnoId, efectivo_final, observaciones = '') {
    const result = await db.query(
      `UPDATE turnos 
       SET hora_fin = CURRENT_TIME,
           efectivo_final = $1,
           observaciones = $2,
           estado = 'cerrado',
           actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $3 AND estado = 'abierto'
       RETURNING *`,
      [efectivo_final, observaciones, turnoId]
    );
    return result.rows[0];
  }

  static async findActivoByEmpleado(empleadoId, fecha) {
    const result = await db.query(
      `SELECT * FROM turnos 
       WHERE empleado_id = $1 
         AND fecha = $2 
         AND estado = 'abierto'
       ORDER BY creado_en DESC
       LIMIT 1`,
      [empleadoId, fecha]
    );
    return result.rows[0];
  }

  static async getCierreCaja(turnoId) {
    const result = await db.query(
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
       WHERE t.id = $1
       GROUP BY t.id, t.fecha, t.tipo_turno, e.nombre_completo, t.efectivo_inicial, t.efectivo_final`,
      [turnoId]
    );
    return result.rows[0];
  }
}

module.exports = Turno;