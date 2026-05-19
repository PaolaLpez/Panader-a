const db = require('../config/database');
const bcrypt = require('bcryptjs');

class EmpleadoController {
  // Obtener todos los empleados (solo admin)
  static async getAll(req, res) {
    try {
      const { page = 1, limit = 20, activo = true } = req.query;
      const offset = (page - 1) * limit;

      const result = await db.query(`
        SELECT e.id, e.nombre_completo, e.fecha_nacimiento, 
               e.telefono, e.foto_url, e.creado_en,
               u.matricula, u.rol, u.email, u.activo, u.creado_en as usuario_creado,
               EXTRACT(YEAR FROM AGE(e.fecha_nacimiento)) as edad
        FROM empleados e
        JOIN usuarios u ON e.usuario_id = u.id
        WHERE u.activo = $1
        ORDER BY e.nombre_completo
        LIMIT $2 OFFSET $3
      `, [activo, limit, offset]);

      // Contar total
      const countResult = await db.query(
        'SELECT COUNT(*) as total FROM empleados e JOIN usuarios u ON e.usuario_id = u.id WHERE u.activo = $1',
        [activo]
      );

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
        message: 'Error al obtener empleados',
        error: error.message
      });
    }
  }

  // Obtener empleado por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query(`
        SELECT e.id, e.nombre_completo, e.fecha_nacimiento, 
               e.telefono, e.foto_url, e.creado_en,
               u.matricula, u.rol, u.email, u.activo, u.creado_en as usuario_creado,
               EXTRACT(YEAR FROM AGE(e.fecha_nacimiento)) as edad
        FROM empleados e
        JOIN usuarios u ON e.usuario_id = u.id
        WHERE e.id = $1
      `, [id]);

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Empleado no encontrado'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener empleado',
        error: error.message
      });
    }
  }

  // Crear nuevo empleado (solo admin)
  static async create(req, res) {
    try {
      const { 
        nombre_completo, 
        fecha_nacimiento, 
        telefono, 
        email, 
        rol = 'empleado',
        password 
      } = req.body;

      console.log('Datos recibidos:', req.body);

      // Validaciones básicas
      if (!nombre_completo || !fecha_nacimiento || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Nombre completo, fecha de nacimiento, email y contraseña son requeridos'
        });
      }

      // Generar matrícula automática
      const nombres = nombre_completo.split(' ');
      const inicialNombre = nombres[0].charAt(0).toUpperCase();
      const inicialApellido = nombres.length > 1 ? nombres[1].charAt(0).toUpperCase() : 'X';
      
      // Buscar última matrícula similar
      const lastMatriculaResult = await db.query(`
        SELECT matricula FROM usuarios 
        WHERE matricula LIKE $1 
        ORDER BY matricula DESC LIMIT 1
      `, [`${inicialNombre}${inicialApellido}-PanaPina-%`]);

      let secuencia = 1;
      if (lastMatriculaResult.rowCount > 0) {
        const lastMatricula = lastMatriculaResult.rows[0].matricula;
        const lastNum = parseInt(lastMatricula.split('-').pop());
        secuencia = lastNum + 1;
      }

      const matricula = `${inicialNombre}${inicialApellido}-PanaPina-${secuencia.toString().padStart(3, '0')}`;

      console.log('Matrícula generada:', matricula);

      // Hashear contraseña
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Iniciar transacción
      await db.query('BEGIN');

      // Crear usuario
      const usuarioResult = await db.query(`
        INSERT INTO usuarios (matricula, email, password_hash, rol)
        VALUES ($1, $2, $3, $4)
        RETURNING id, matricula, email, rol
      `, [matricula, email, passwordHash, rol]);

      const usuarioId = usuarioResult.rows[0].id;

      // Crear empleado
      const empleadoResult = await db.query(`
        INSERT INTO empleados (usuario_id, nombre_completo, fecha_nacimiento, telefono)
        VALUES ($1, $2, $3, $4)
        RETURNING id, nombre_completo, fecha_nacimiento, telefono, creado_en
      `, [usuarioId, nombre_completo, fecha_nacimiento, telefono]);

      await db.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Empleado creado exitosamente',
        data: {
          empleado: empleadoResult.rows[0],
          usuario: usuarioResult.rows[0]
        }
      });

    } catch (error) {
      await db.query('ROLLBACK');
      console.error('Error al crear empleado:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear empleado',
        error: error.message
      });
    }
  }

  // Actualizar empleado
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { nombre_completo, fecha_nacimiento, telefono, email } = req.body;

      // Verificar que el empleado existe
      const empleadoExists = await db.query(
        'SELECT id FROM empleados WHERE id = $1',
        [id]
      );

      if (empleadoExists.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Empleado no encontrado'
        });
      }

      // Actualizar empleado
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (nombre_completo) {
        fields.push(`nombre_completo = $${paramCount}`);
        values.push(nombre_completo);
        paramCount++;
      }

      if (fecha_nacimiento) {
        fields.push(`fecha_nacimiento = $${paramCount}`);
        values.push(fecha_nacimiento);
        paramCount++;
      }

      if (telefono !== undefined) {
        fields.push(`telefono = $${paramCount}`);
        values.push(telefono);
        paramCount++;
      }

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos para actualizar'
        });
      }

      values.push(id);
      const empleadoQuery = `
        UPDATE empleados 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, nombre_completo, fecha_nacimiento, telefono, foto_url
      `;

      const empleadoResult = await db.query(empleadoQuery, values);

      // Actualizar email si se proporciona
      if (email) {
        const usuarioResult = await db.query(
          `SELECT usuario_id FROM empleados WHERE id = $1`,
          [id]
        );
        
        if (usuarioResult.rowCount > 0) {
          const usuarioId = usuarioResult.rows[0].usuario_id;
          await db.query(
            `UPDATE usuarios SET email = $1, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2`,
            [email, usuarioId]
          );
        }
      }

      res.json({
        success: true,
        message: 'Empleado actualizado exitosamente',
        data: empleadoResult.rows[0]
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al actualizar empleado',
        error: error.message
      });
    }
  }

  // Eliminar/desactivar empleado
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const { permanent = false } = req.query;

      if (permanent === 'true') {
        // Eliminación permanente (solo para desarrollo)
        await db.query('DELETE FROM empleados WHERE id = $1', [id]);
        
        res.json({
          success: true,
          message: 'Empleado eliminado permanentemente'
        });
      } else {
        // Desactivar usuario (eliminación lógica)
        const usuarioResult = await db.query(
          `SELECT usuario_id FROM empleados WHERE id = $1`,
          [id]
        );

        if (usuarioResult.rowCount === 0) {
          return res.status(404).json({
            success: false,
            message: 'Empleado no encontrado'
          });
        }

        const usuarioId = usuarioResult.rows[0].usuario_id;
        await db.query(
          `UPDATE usuarios SET activo = false, actualizado_en = CURRENT_TIMESTAMP WHERE id = $1`,
          [usuarioId]
        );

        res.json({
          success: true,
          message: 'Empleado desactivado exitosamente'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al eliminar empleado',
        error: error.message
      });
    }
  }

  // Buscar empleados por nombre o matrícula
  static async search(req, res) {
    try {
      const { query } = req.query;

      if (!query || query.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'La búsqueda debe tener al menos 2 caracteres'
        });
      }

      const searchQuery = `%${query}%`;
      
      const result = await db.query(`
        SELECT e.id, e.nombre_completo, e.telefono, e.foto_url,
               u.matricula, u.rol, u.email, u.activo,
               EXTRACT(YEAR FROM AGE(e.fecha_nacimiento)) as edad
        FROM empleados e
        JOIN usuarios u ON e.usuario_id = u.id
        WHERE (e.nombre_completo ILIKE $1 OR u.matricula ILIKE $1)
          AND u.activo = true
        ORDER BY e.nombre_completo
        LIMIT 20
      `, [searchQuery]);

      res.json({
        success: true,
        data: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error en la búsqueda',
        error: error.message
      });
    }
  }
}

module.exports = EmpleadoController;