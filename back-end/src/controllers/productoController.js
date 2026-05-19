const db = require('../config/database');

class ProductoController {
  // Obtener todos los productos
  static async getAll(req, res) {
    try {
      const { tipo, categoria, visible = 'true' } = req.query;
      
      let query = `
        SELECT p.*, cp.nombre as categoria_nombre,
               CASE 
                 WHEN p.stock_actual <= p.stock_minimo THEN 'bajo'
                 ELSE 'normal'
               END as estado_stock
        FROM productos p 
        LEFT JOIN categorias_pan cp ON p.categoria_id = cp.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;

      if (tipo) {
        query += ` AND p.tipo_pan = $${paramCount}`;
        params.push(tipo);
        paramCount++;
      }

      if (categoria) {
        query += ` AND cp.nombre = $${paramCount}`;
        params.push(categoria);
        paramCount++;
      }

      if (visible === 'true') {
        query += ` AND p.visible = true`;
      } else if (visible === 'false') {
        query += ` AND p.visible = false`;
      }

      query += ` ORDER BY p.nombre`;

      const result = await db.query(query, params);

      res.json({
        success: true,
        count: result.rowCount,
        data: result.rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos',
        error: error.message
      });
    }
  }

  // Obtener producto por ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query(`
        SELECT p.*, cp.nombre as categoria_nombre
        FROM productos p 
        LEFT JOIN categorias_pan cp ON p.categoria_id = cp.id
        WHERE p.id = $1
      `, [id]);

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener producto',
        error: error.message
      });
    }
  }

  // Crear nuevo producto (admin)
  static async create(req, res) {
    try {
      const { 
        nombre, 
        descripcion, 
        precio, 
        costo,
        tipo_pan,
        categoria_id,
        stock_actual,
        stock_minimo,
        imagen_url
      } = req.body;

      // Validaciones
      if (!nombre || !precio || !tipo_pan) {
        return res.status(400).json({
          success: false,
          message: 'Nombre, precio y tipo de pan son requeridos'
        });
      }

      const result = await db.query(`
        INSERT INTO productos (
          nombre, descripcion, precio, costo, tipo_pan,
          categoria_id, stock_actual, stock_minimo, imagen_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        nombre, descripcion, precio, costo, tipo_pan,
        categoria_id, stock_actual || 0, stock_minimo || 10, imagen_url
      ]);

      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al crear producto',
        error: error.message
      });
    }
  }

  // Actualizar producto (admin)
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Verificar que el producto existe
      const productoExists = await db.query(
        'SELECT id FROM productos WHERE id = $1',
        [id]
      );

      if (productoExists.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Construir query dinámica
      const fields = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (key !== 'id') {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos para actualizar'
        });
      }

      // Agregar campo actualizado_en
      fields.push('actualizado_en = CURRENT_TIMESTAMP');
      
      values.push(id);
      const query = `
        UPDATE productos 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await db.query(query, values);

      res.json({
        success: true,
        message: 'Producto actualizado exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al actualizar producto',
        error: error.message
      });
    }
  }

  // Cambiar visibilidad de producto (admin)
  static async toggleVisibility(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query(`
        UPDATE productos 
        SET visible = NOT visible, actualizado_en = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, nombre, visible
      `, [id]);

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      res.json({
        success: true,
        message: `Producto ${result.rows[0].visible ? 'activado' : 'desactivado'}`,
        data: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al cambiar visibilidad',
        error: error.message
      });
    }
  }

  // Obtener categorías
  static async getCategorias(req, res) {
    try {
      const result = await db.query(`
        SELECT * FROM categorias_pan 
        ORDER BY nombre
      `);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener categorías',
        error: error.message
      });
    }
  }

  // Obtener productos del refri
  static async getRefri(req, res) {
    try {
      const result = await db.query(`
        SELECT * FROM productos_refri 
        ORDER BY nombre
      `);

      res.json({
        success: true,
        count: result.rowCount,
        data: result.rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos del refri',
        error: error.message
      });
    }
  }

  // Obtener productos de la tienda
  static async getTienda(req, res) {
    try {
      const result = await db.query(`
        SELECT * FROM productos_tienda 
        ORDER BY nombre
      `);

      res.json({
        success: true,
        count: result.rowCount,
        data: result.rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos de la tienda',
        error: error.message
      });
    }
  }

  // Buscar productos
  static async search(req, res) {
    try {
      const { q } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'La búsqueda debe tener al menos 2 caracteres'
        });
      }

      const searchQuery = `%${q}%`;
      
      const result = await db.query(`
        SELECT p.*, cp.nombre as categoria_nombre
        FROM productos p 
        LEFT JOIN categorias_pan cp ON p.categoria_id = cp.id
        WHERE (p.nombre ILIKE $1 OR p.descripcion ILIKE $1)
          AND p.visible = true
        ORDER BY p.nombre
        LIMIT 20
      `, [searchQuery]);

      res.json({
        success: true,
        count: result.rowCount,
        data: result.rows
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

module.exports = ProductoController;