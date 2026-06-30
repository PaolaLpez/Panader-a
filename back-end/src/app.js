const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/database');

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const empleadosRoutes = require('./routes/empleados.routes');
const productosRoutes = require('./routes/productos.routes');
const ventasRoutes = require('./routes/ventas.routes');
const turnosRoutes = require('./routes/turnos.routes');
const reportesRoutes = require('./routes/reportes.routes');

// Cargar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 API de Panadería PanaPina',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      productos: '/api/productos',
      empleados: '/api/empleados',
      ventas: '/api/ventas',
      turnos: '/api/turnos',
      reportes: '/api/reportes'
    }
  });
});

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: 'connected'
  });
});

// Ruta de prueba de base de datos
app.get('/api/test-db', async (req, res) => {
  try {
    const timeResult = await db.query('SELECT NOW() as server_time');
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const productosCount = await db.query('SELECT COUNT(*) as total FROM productos');
    const usuariosCount = await db.query('SELECT COUNT(*) as total FROM usuarios');
    const empleadosCount = await db.query('SELECT COUNT(*) as total FROM empleados');
    
    res.json({
      success: true,
      message: '✅ Conexión a PostgreSQL exitosa',
      data: {
        server_time: timeResult.rows[0].server_time,
        tables: tablesResult.rows.map(t => t.table_name),
        counts: {
          productos: parseInt(productosCount.rows[0].total),
          usuarios: parseInt(usuariosCount.rows[0].total),
          empleados: parseInt(empleadosCount.rows[0].total)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '❌ Error en la base de datos',
      error: error.message
    });
  }
});

// Autenticación
app.use('/api/auth', authRoutes);

// Empleados
app.use('/api/empleados', empleadosRoutes);

// Productos
app.use('/api/productos', productosRoutes);

// Ventas
app.use('/api/ventas', ventasRoutes);

// Turnos
app.use('/api/turnos', turnosRoutes);

// Reportes
app.use('/api/reportes', reportesRoutes);

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '🔍 Ruta no encontrada',
    path: req.originalUrl
  });
});


app.use((error, req, res, next) => {
  console.error('💥 Error:', error);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Ocurrió un error'
  });
});

const startServer = async () => {
  const PORT = process.env.PORT || 5000;
  
  console.log('🔌 Probando conexión a PostgreSQL...');
  const dbConnected = await db.testConnection();
  
  if (!dbConnected) {
    console.log('⚠️  Continuando sin conexión a base de datos...');
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
};

startServer();