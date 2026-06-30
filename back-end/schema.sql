-- PanaPina - Esquema de base de datos PostgreSQL
--
-- 1. Crear la base de datos (solo una vez):
--    createdb -U postgres panapina
-- 2. Ejecutar este archivo:
--    psql -U postgres -d panapina -f schema.sql

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Usuarios del sistema
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  matricula VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'empleado' CHECK (rol IN ('admin', 'empleado')),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Empleados (datos personales vinculados al usuario)
CREATE TABLE empleados (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre_completo VARCHAR(120) NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  telefono VARCHAR(20),
  foto_url TEXT,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Categorías de pan
CREATE TABLE categorias_pan (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE,
  descripcion TEXT,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Productos de panadería
CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10, 2) NOT NULL CHECK (precio >= 0),
  costo DECIMAL(10, 2) DEFAULT 0 CHECK (costo >= 0),
  tipo_pan VARCHAR(50) NOT NULL,
  categoria_id INTEGER REFERENCES categorias_pan(id) ON DELETE SET NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  stock_actual INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  stock_minimo INTEGER NOT NULL DEFAULT 10 CHECK (stock_minimo >= 0),
  imagen_url TEXT,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Productos del refrigerador
CREATE TABLE productos_refri (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10, 2) NOT NULL CHECK (precio >= 0),
  stock_actual INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  visible BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Productos de tienda (abarrotes, etc.)
CREATE TABLE productos_tienda (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10, 2) NOT NULL CHECK (precio >= 0),
  stock_actual INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  visible BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Turnos de caja
CREATE TABLE turnos (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,
  fecha DATE NOT NULL,
  tipo_turno VARCHAR(20) NOT NULL CHECK (tipo_turno IN ('mañana', 'noche')),
  hora_inicio TIME NOT NULL,
  hora_fin TIME,
  efectivo_inicial DECIMAL(10, 2) NOT NULL DEFAULT 0,
  efectivo_final DECIMAL(10, 2),
  observaciones TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ventas
CREATE TABLE ventas (
  id SERIAL PRIMARY KEY,
  folio VARCHAR(40) UNIQUE NOT NULL,
  total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
  pago_recibido DECIMAL(10, 2) NOT NULL CHECK (pago_recibido >= 0),
  cambio DECIMAL(10, 2) NOT NULL DEFAULT 0,
  metodo_pago VARCHAR(20) NOT NULL DEFAULT 'efectivo',
  estado VARCHAR(20) NOT NULL DEFAULT 'completada' CHECK (estado IN ('completada', 'cancelada')),
  turno_id INTEGER REFERENCES turnos(id) ON DELETE SET NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Detalle de cada venta
CREATE TABLE detalle_venta (
  id SERIAL PRIMARY KEY,
  venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id INTEGER NOT NULL,
  tipo_producto VARCHAR(20) NOT NULL CHECK (tipo_producto IN ('pan', 'refri', 'tienda')),
  nombre_producto VARCHAR(120) NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL
);

-- Retiros de caja durante un turno
CREATE TABLE retiros_caja (
  id SERIAL PRIMARY KEY,
  turno_id INTEGER NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
  monto DECIMAL(10, 2) NOT NULL CHECK (monto > 0),
  tipo VARCHAR(30) NOT NULL,
  motivo VARCHAR(120) NOT NULL,
  descripcion TEXT,
  autorizado_por INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_productos_visible ON productos(visible);
CREATE INDEX idx_productos_tipo ON productos(tipo_pan);
CREATE INDEX idx_ventas_fecha ON ventas(creado_en);
CREATE INDEX idx_ventas_turno ON ventas(turno_id);
CREATE INDEX idx_turnos_empleado_fecha ON turnos(empleado_id, fecha);
CREATE INDEX idx_detalle_venta_venta ON detalle_venta(venta_id);

-- Vistas para reportes
CREATE OR REPLACE VIEW ventas_diarias AS
SELECT
  DATE(creado_en) AS fecha,
  COUNT(*) AS total_ventas,
  SUM(total) AS ingreso_total,
  SUM(pago_recibido) AS recibido_total,
  SUM(cambio) AS cambio_total
FROM ventas
WHERE estado = 'completada'
GROUP BY DATE(creado_en);

CREATE OR REPLACE VIEW productos_mas_vendidos AS
SELECT
  dv.nombre_producto,
  dv.tipo_producto,
  SUM(dv.cantidad) AS total_vendido,
  SUM(dv.subtotal) AS ingreso_generado
FROM detalle_venta dv
JOIN ventas v ON dv.venta_id = v.id
WHERE v.estado = 'completada'
GROUP BY dv.nombre_producto, dv.tipo_producto
ORDER BY total_vendido DESC;

CREATE OR REPLACE VIEW cierre_caja_turno AS
SELECT
  t.id,
  t.fecha,
  t.tipo_turno,
  e.nombre_completo AS empleado,
  t.efectivo_inicial,
  COALESCE(SUM(v.total), 0) AS ventas_totales,
  COALESCE(SUM(r.monto), 0) AS retiros_totales,
  t.efectivo_final,
  (t.efectivo_inicial + COALESCE(SUM(v.total), 0) - COALESCE(SUM(r.monto), 0)) AS efectivo_calculado
FROM turnos t
JOIN empleados e ON t.empleado_id = e.id
LEFT JOIN ventas v ON t.id = v.turno_id AND v.estado = 'completada'
LEFT JOIN retiros_caja r ON t.id = r.turno_id
WHERE t.estado = 'cerrado'
GROUP BY t.id, t.fecha, t.tipo_turno, e.nombre_completo, t.efectivo_inicial, t.efectivo_final;

-- Datos iniciales
INSERT INTO categorias_pan (nombre, descripcion) VALUES
  ('Dulce', 'Panes y bollos dulces'),
  ('Salado', 'Panes salados y tradicionales'),
  ('Especial', 'Productos de temporada');

INSERT INTO usuarios (matricula, email, password_hash, rol) VALUES
  ('AD-PanaPina-001', 'admin@panapina.local', '$2b$10$mR08pEQQh5aed3etxXwSiu4uAyxO2Qdnet72jkLxPgSgRwPB8DCCe', 'admin');

INSERT INTO empleados (usuario_id, nombre_completo, fecha_nacimiento, telefono) VALUES
  (1, 'Administrador PanaPina', '1990-01-15', '555-000-0001');

INSERT INTO productos (nombre, descripcion, precio, costo, tipo_pan, categoria_id, stock_actual, stock_minimo) VALUES
  ('Bolillo', 'Bolillo crujiente tradicional', 3.50, 1.20, 'blanco', 2, 80, 20),
  ('Concha vainilla', 'Concha con topping de vainilla', 8.00, 2.50, 'dulce', 1, 45, 15),
  ('Telera', 'Telera para tortas', 4.00, 1.40, 'blanco', 2, 60, 20),
  ('Oreja', 'Hojaldre azucarado', 10.00, 3.00, 'dulce', 1, 30, 10);

INSERT INTO productos_refri (nombre, descripcion, precio, stock_actual) VALUES
  ('Agua 600ml', 'Agua purificada', 12.00, 48),
  ('Refresco 355ml', 'Refresco de cola', 18.00, 36);

INSERT INTO productos_tienda (nombre, descripcion, precio, stock_actual) VALUES
  ('Leche 1L', 'Leche entera', 28.00, 24),
  ('Café soluble 50g', 'Café instantáneo', 35.00, 12);
