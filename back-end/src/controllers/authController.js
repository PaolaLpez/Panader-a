const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

class AuthController {
  // Login de usuario
  static async login(req, res) {
    try {
      const { matricula, password } = req.body;

      // Validar entrada
      if (!matricula || !password) {
        return res.status(400).json({
          success: false,
          message: 'Matrícula y contraseña son requeridos'
        });
      }

      // Buscar usuario en la base de datos
      const userResult = await db.query(
        'SELECT * FROM usuarios WHERE matricula = $1 AND activo = true',
        [matricula]
      );

      if (userResult.rowCount === 0) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      const user = userResult.rows[0];

      // Verificar contraseña
      let passwordValid = false;
      
      // Para desarrollo: permitir contraseña simple para admin
      if (matricula === 'AD-PanaPina-001' && password === 'admin123') {
        passwordValid = true;
      } else {
        // Verificar con bcrypt para otros usuarios
        passwordValid = await bcrypt.compare(password, user.password_hash);
      }

      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Obtener información del empleado
      const empleadoResult = await db.query(
        'SELECT * FROM empleados WHERE usuario_id = $1',
        [user.id]
      );

      // Crear token JWT
      const token = jwt.sign(
        {
          id: user.id,
          matricula: user.matricula,
          rol: user.rol
        },
        process.env.JWT_SECRET || 'default_secret_for_development',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          token,
          user: {
            id: user.id,
            matricula: user.matricula,
            rol: user.rol,
            email: user.email,
            nombre: empleadoResult.rows[0]?.nombre_completo || 'Usuario',
            telefono: empleadoResult.rows[0]?.telefono,
            foto_url: empleadoResult.rows[0]?.foto_url
          }
        }
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        message: 'Error en el servidor',
        error: error.message
      });
    }
  }

  // Verificar token (middleware)
  static verifyToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Token no proporcionado'
        });
      }

      const token = authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token no válido'
        });
      }

      // Verificar token JWT
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'default_secret_for_development'
      );
      
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
  }

  // Verificar rol de administrador (middleware)
  static requireAdmin(req, res, next) {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requiere rol de administrador.'
      });
    }
    next();
  }

  // Verificar si es empleado o admin (middleware)
 static isEmployeeOrAdmin(req, res, next) {
    if (req.user.rol === 'empleado' || req.user.rol === 'admin') {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requiere rol de empleado o administrador.'
      });
    }
  }

  // Obtener perfil del usuario actual
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;

      // Obtener usuario
      const userResult = await db.query(
        'SELECT * FROM usuarios WHERE id = $1',
        [userId]
      );

      if (userResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const user = userResult.rows[0];

      // Obtener información del empleado
      const empleadoResult = await db.query(
        'SELECT * FROM empleados WHERE usuario_id = $1',
        [userId]
      );

      // Calcular edad si tiene fecha de nacimiento
      let edad = null;
      if (empleadoResult.rows[0]?.fecha_nacimiento) {
        const hoy = new Date();
        const nacimiento = new Date(empleadoResult.rows[0].fecha_nacimiento);
        edad = hoy.getFullYear() - nacimiento.getFullYear();
        const mes = hoy.getMonth() - nacimiento.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
          edad--;
        }
      }

      res.json({
        success: true,
        data: {
          usuario: {
            id: user.id,
            matricula: user.matricula,
            rol: user.rol,
            email: user.email,
            activo: user.activo,
            creado_en: user.creado_en
          },
          empleado: {
            ...empleadoResult.rows[0],
            edad: edad
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener perfil',
        error: error.message
      });
    }
  }

  // Cambiar contraseña
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Contraseña actual y nueva son requeridas'
        });
      }

      // Obtener usuario
      const userResult = await db.query(
        'SELECT * FROM usuarios WHERE id = $1',
        [userId]
      );

      if (userResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const user = userResult.rows[0];

      // Verificar contraseña actual
      let isValid = false;
      
      // Para admin en desarrollo
      if (user.matricula === 'AD-PanaPina-001' && currentPassword === 'admin123') {
        isValid = true;
      } else {
        // Verificar con bcrypt
        isValid = await bcrypt.compare(currentPassword, user.password_hash);
      }

      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Contraseña actual incorrecta'
        });
      }

      // Hashear nueva contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Actualizar contraseña
      await db.query(
        'UPDATE usuarios SET password_hash = $1, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedPassword, userId]
      );

      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al cambiar contraseña',
        error: error.message
      });
    }
  }
}

module.exports = AuthController;