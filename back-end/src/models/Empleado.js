const db = require('../config/database');

class Empleado {
  static async findByUsuarioId(usuarioId) {
    const result = await db.query(
      'SELECT * FROM empleados WHERE usuario_id = $1',
      [usuarioId]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM empleados WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async getAll(limit = 50, offset = 0) {
    const result = await db.query(
      `SELECT e.*, u.matricula, u.rol, u.email, u.activo
       FROM empleados e
       JOIN usuarios u ON e.usuario_id = u.id
       WHERE u.activo = true
       ORDER BY e.nombre_completo
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  static async update(id, data) {
    const { nombre_completo, fecha_nacimiento, telefono, foto_url } = data;
    const result = await db.query(
      `UPDATE empleados 
       SET nombre_completo = $1, fecha_nacimiento = $2, 
           telefono = $3, foto_url = $4
       WHERE id = $5
       RETURNING *`,
      [nombre_completo, fecha_nacimiento, telefono, foto_url, id]
    );
    return result.rows[0];
  }

  static async calcularEdad(fechaNacimiento) {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  }
}

module.exports = Empleado;