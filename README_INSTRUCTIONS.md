# Guía de Inicio - Panadería PanaPina (POS & Gestión)

Esta es la guía de configuración del sistema de punto de venta (POS) y gestión administrativa para la panadería **PanaPina**. El sistema cuenta con un Backend robusto (Express + PostgreSQL) y un Frontend interactivo y moderno (React + Vite).

---

## 1. Configuración de la Base de Datos (PostgreSQL)

El backend requiere una base de datos PostgreSQL llamada `panapina`. Sigue estos pasos para crearla e importar el esquema inicial:

1. Abre tu terminal de base de datos (o la herramienta `pgAdmin` o `psql`) y ejecuta:
   ```sql
   CREATE DATABASE panapina;
   ```
2. Una vez creada la base de datos, ejecuta el archivo `schema.sql` que se encuentra en la carpeta `Panader-a/back-end/schema.sql` para inicializar las tablas, vistas y datos por defecto:
   ```bash
   # En la terminal (ejecutar desde la carpeta back-end):
   psql -U postgres -d panapina -f schema.sql
   ```
   *(Si tu usuario o puerto es distinto, asegúrate de configurar los parámetros correctos en la línea de comando).*

---

## 2. Configuración del Backend

1. Abre la carpeta `Panader-a/back-end` en tu terminal o editor de código.
2. Copia el archivo `.env.example` y renombralo como `.env`:
   ```bash
   copy .env.example .env
   ```
3. Edita las variables de entorno en `.env` para ajustarlas a tus credenciales locales de PostgreSQL:
   ```env
   PORT=5000
   NODE_ENV=development

   # PostgreSQL
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=panapina
   DB_USER=postgres
   DB_PASSWORD=tu_contraseña_aqui  # <--- Cambia esto por tu contraseña de Postgres

   # JWT
   JWT_SECRET=secreto_desarrollo_panapina
   JWT_EXPIRE=7d
   ```
4. Instala las dependencias necesarias:
   ```bash
   npm install
   ```
5. Inicia el servidor de desarrollo del backend:
   ```bash
   npm run dev
   ```
   El backend se levantará en `http://localhost:5000`. Puedes verificar que la conexión a la base de datos sea correcta accediendo a: `http://localhost:5000/api/test-db`.

---

## 3. Configuración del Frontend (React + Vite)

1. Abre la carpeta `Frontend` en tu terminal.
2. Instala las dependencias necesarias (incluyendo las agregadas para el enrutado e iconos):
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo del frontend:
   ```bash
   npm run dev
   ```
   El frontend se levantará por defecto en `http://localhost:5173`. Abre esa URL en tu navegador web.

---

## 4. Guía de Uso y Flujo de Trabajo Común

### A. Acceso al Sistema (Login)
- **Matrícula:** `AD-PanaPina-001`
- **Contraseña:** `admin123`
*Este es el usuario administrador inicial cargado automáticamente en el esquema de la base de datos.*

### B. Proceso de Apertura de Caja (Turnos)
1. Al ingresar, el sistema detectará que la caja está cerrada y el módulo de Punto de Venta (POS) estará inhabilitado de forma segura.
2. Dirígete a **Caja Registradora** en el menú lateral.
3. Elige el turno (Mañana / Noche) e ingresa un efectivo inicial de fondo (ej: `$200.00`).
4. Haz clic en **Iniciar Turno de Caja**. Las ventas quedarán inmediatamente habilitadas.

### C. Registro de Ventas (POS)
1. Ve al **Punto de Venta**.
2. Filtra por categorías (Panadería, Refrigerador, Tienda) o busca un producto por nombre.
3. Agrega panes u otros productos haciendo clic en ellos.
4. En el panel derecho (Carrito), ajusta las cantidades.
5. Elige el método de pago:
   - Si es **Tarjeta**, haz clic en "Registrar y Cobrar".
   - Si es **Efectivo**, ingresa el dinero recibido del cliente en "Efectivo Recibido" (el sistema calculará el cambio automáticamente) y haz clic en "Registrar y Cobrar".
6. Se abrirá una modal mostrando el ticket detallado de la venta con su folio único generado por el servidor.

### D. Retiros de Caja (Salidas de Dinero)
1. Si necesitas pagar a un proveedor de harina, huevo o realizar un retiro de seguridad:
2. Ve a **Caja Registradora**.
3. En el formulario **Retiros de Caja**, ingresa el monto, la categoría y el motivo.
4. Haz clic en **Registrar Salida de Efectivo**. El monto se restará del efectivo final calculado.

### E. Cierre de Caja y Arqueo
1. Al finalizar tu turno, ve a **Caja Registradora**.
2. Cuenta el efectivo real que tienes físicamente en tu caja.
3. Ingrésalo en el campo **Efectivo Final Físico** y haz clic en **Proceder al Arqueo y Cerrar Caja**.
4. El sistema mostrará de inmediato un resumen de la auditoría indicando si tu caja está cuadrada, o si hay algún sobrante o faltante.

### F. Gestión de Catálogo y Personal (Solo Administrador)
- En **Inventario** puedes agregar nuevos panes, modificar precios, costos de materia prima, stock de alerta o deshabilitar temporalmente la visibilidad de un pan para que no salga en la pantalla del POS.
- En **Personal** puedes contratar nuevos empleados. El sistema generará su matrícula de acceso única automáticamente basada en sus iniciales.
- En **Analíticas** podrás visualizar gráficos interactivos del flujo diario de ingresos, porcentaje de cobros en tarjeta vs. efectivo, estadísticas de valor total del inventario y ranking de productos más vendidos.

---

### G. Portal de Clientes y Pedidos en Línea
1. Cualquier cliente puede entrar a `http://localhost:5173/client` (o haciendo clic en el botón inferior en la pantalla de login).
2. Los clientes pueden seleccionar panes, añadirlos a su canasta y reservar su orden indicando su nombre, teléfono y hora estimada de recogida.
3. El cliente puede consultar el historial de sus pedidos ingresando su número de teléfono en la pestaña **Consultar Mis Pedidos**.
4. En el panel de administración, los empleados tienen control total:
   - En **Pedidos en Línea** en el menú lateral, pueden visualizar todos los pedidos recibidos de clientes, filtrarlos por estado (pendiente, completado, cancelado) y cambiar su estado manualmente.
   - En el **Punto de Venta (POS)**, los cajeros verán un botón de alerta `Pedidos (N)`. Al hacer clic, pueden importar el pedido del cliente directamente a la venta actual, realizar el cobro, registrar la venta y marcar el pedido en línea como `completado` automáticamente.

---

## Ajustes y Correcciones Realizadas en el Backend:
1. **Reconciliación de Caja:** Se corrigió el modelo `Venta.js` para persistir correctamente el `turno_id` de la venta. Anteriormente no se guardaba, dejando los cierres de caja en `$0.00`.
2. **Flexibilidad en Turnos:** Se relajó la validación horaria de turnos en el backend para desarrollo (`process.env.NODE_ENV !== 'production'`), permitiendo iniciar turnos a cualquier hora para facilitar su uso y prueba.
3. **Corrección SQL:** Se solucionó una consulta de base de datos en `turnoController.js` que fallaba en PostgreSQL por el uso incorrecto de comillas dobles en la cadena `'abierto'`.
4. **Auto-inicialización de Base de Datos:** Se programó una rutina de migración automática en el arranque del servidor (`app.js`). Si el backend se conecta con PostgreSQL, detectará si faltan las tablas `pedidos` y `detalle_pedido` y las creará automáticamente con sus respectivos índices y llaves foráneas.

