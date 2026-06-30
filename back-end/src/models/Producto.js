const db = require('../config/database');

class Producto {
  static async findAll(where = '', params = []) {
    const query = `
      SELECT p.*, cp.nombre as categoria_nombre
      FROM productos p
      LEFT JOIN categorias_pan cp ON p.categoria_id = cp.id
      ${where}
      ORDER BY p.nombre
    `;
    const result = await db.query(query, params);
    return result.rows;
  }

  static async findById(id) {
    const result = await db.query(
      `SELECT p.*, cp.nombre as categoria_nombre
       FROM productos p
       LEFT JOIN categorias_pan cp ON p.categoria_id = cp.id
       WHERE p.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async create(data) {
    const {
      nombre, descripcion, precio, costo, tipo_pan,
      categoria_id, visible = true, stock_actual = 0,
      stock_minimo = 10, imagen_url
    } = data;

    const result = await db.query(
      `INSERT INTO productos (
        nombre, descripcion, precio, costo, tipo_pan,
        categoria_id, visible, stock_actual, stock_minimo, imagen_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        nombre, descripcion, precio, costo, tipo_pan,
        categoria_id, visible, stock_actual, stock_minimo, imagen_url
      ]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(data)) {
      if (key !== 'id') {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    fields.push('actualizado_en = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `
      UPDATE productos 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async updateStock(id, cantidad) {
    const result = await db.query(
      `UPDATE productos 
       SET stock_actual = stock_actual - $1,
           actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $2 AND stock_actual >= $1
       RETURNING *`,
      [cantidad, id]
    );
    return result.rows[0];
  }

  static async getByType(tipo) {
    const result = await db.query(
      `SELECT p.*, cp.nombre as categoria_nombre
       FROM productos p
       LEFT JOIN categorias_pan cp ON p.categoria_id = cp.id
       WHERE p.tipo_pan = $1 AND p.visible = true
       ORDER BY p.nombre`,
      [tipo]
    );
    return result.rows;
  }

  static async search(query) {
    const searchTerm = `%${query}%`;
    const result = await db.query(
      `SELECT p.*, cp.nombre as categoria_nombre
       FROM productos p
       LEFT JOIN categorias_pan cp ON p.categoria_id = cp.id
       WHERE (p.nombre ILIKE $1 OR p.descripcion ILIKE $1)
         AND p.visible = true
       ORDER BY p.nombre
       LIMIT 20`,
      [searchTerm]
    );
    return result.rows;
  }
}

module.exports = Producto;