const { Pool } = require('pg');
require('dotenv').config();

// Configuración de la conexión
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  max: 20, // máximo de conexiones
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Evento cuando se conecta
pool.on('connect', () => {
  console.log('Conexión exitosa a PostgreSQL');
});

// Evento de error
pool.on('error', (err) => {
  console.error('❌ Error en PostgreSQL:', err.message);
});

// Función para probar conexión
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log(' PostgreSQL conectado correctamente');
    client.release();
    return true;
  } catch (error) {
    console.error(' No se pudo conectar a PostgreSQL:', error.message);
    return false;
  }
};

// Exportar
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  testConnection
};