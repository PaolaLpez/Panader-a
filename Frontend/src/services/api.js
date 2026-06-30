const API_URL = 'http://localhost:5000/api';

// Bandera global para verificar si estamos en modo offline
let offlineMode = false;

// Inicialización de la Base de Datos Local en localStorage (Mock Mode)
const MOCK_DB = {
  categorias: [
    { id: 1, nombre: 'Dulce', descripcion: 'Panes y bollos dulces' },
    { id: 2, nombre: 'Salado', descripcion: 'Panes salados y tradicionales' },
    { id: 3, nombre: 'Especial', descripcion: 'Productos de temporada' }
  ],
  productos: [
    { id: 1, nombre: 'Bolillo', descripcion: 'Bolillo crujiente tradicional', precio: 3.50, costo: 1.20, tipo_pan: 'blanco', categoria_id: 2, categoria_nombre: 'Salado', visible: true, stock_actual: 80, stock_minimo: 20 },
    { id: 2, nombre: 'Concha vainilla', descripcion: 'Concha con topping de vainilla', precio: 8.00, costo: 2.50, tipo_pan: 'dulce', categoria_id: 1, categoria_nombre: 'Dulce', visible: true, stock_actual: 45, stock_minimo: 15 },
    { id: 3, nombre: 'Telera', descripcion: 'Telera para tortas', precio: 4.00, costo: 1.40, tipo_pan: 'blanco', categoria_id: 2, categoria_nombre: 'Salado', visible: true, stock_actual: 60, stock_minimo: 20 },
    { id: 4, nombre: 'Oreja', descripcion: 'Hojaldre azucarado', precio: 10.00, costo: 3.00, tipo_pan: 'dulce', categoria_id: 1, categoria_nombre: 'Dulce', visible: true, stock_actual: 30, stock_minimo: 10 },
    { id: 5, nombre: 'Concha chocolate', descripcion: 'Concha tradicional de chocolate', precio: 8.50, costo: 2.70, tipo_pan: 'dulce', categoria_id: 1, categoria_nombre: 'Dulce', visible: true, stock_actual: 40, stock_minimo: 12, imagen_url: '/images/concha_chocolate.png' },
    { id: 6, nombre: 'Cuernito de mantequilla', descripcion: 'Croissant hojaldrado con mantequilla', precio: 12.00, costo: 4.50, tipo_pan: 'dulce', categoria_id: 1, categoria_nombre: 'Dulce', visible: true, stock_actual: 25, stock_minimo: 8, imagen_url: '/images/croissant_cuernito.png' },
    { id: 7, nombre: 'Dona chocolate', descripcion: 'Dona glaseada con chispas de colores', precio: 10.00, costo: 3.50, tipo_pan: 'dulce', categoria_id: 1, categoria_nombre: 'Dulce', visible: true, stock_actual: 35, stock_minimo: 10, imagen_url: '/images/dona_chocolate.png' }
  ],
  productos_refri: [
    { id: 1, nombre: 'Agua 600ml', descripcion: 'Agua purificada', precio: 12.00, stock_actual: 48, visible: true },
    { id: 2, nombre: 'Refresco 355ml', descripcion: 'Refresco de cola', precio: 18.00, stock_actual: 36, visible: true }
  ],
  productos_tienda: [
    { id: 1, nombre: 'Leche 1L', descripcion: 'Leche entera', precio: 28.00, stock_actual: 24, visible: true },
    { id: 2, nombre: 'Café soluble 50g', descripcion: 'Café instantáneo', precio: 35.00, stock_actual: 12, visible: true }
  ],
  usuarios: [
    { id: 1, matricula: 'AD-PanaPina-001', email: 'admin@panapina.local', password_hash: 'admin123', rol: 'admin', activo: true }
  ],
  empleados: [
    { id: 1, usuario_id: 1, nombre_completo: 'Administrador PanaPina (Local)', fecha_nacimiento: '1990-01-15', telefono: '555-000-0001', matricula: 'AD-PanaPina-001', email: 'admin@panapina.local', rol: 'admin', activo: true, edad: 36 }
  ],
  ventas: [],
  detalle_venta: [],
  turnos: [],
  retiros_caja: [],
  pedidos: []
};

// Asegurar que el almacenamiento local tenga datos de prueba frescos si no existen o están desactualizados
let memoryDb = {};
const initLocalDb = () => {
  try {
    const MOCK_DB_VERSION = 'v1.6';
    const currentVersion = localStorage.getItem('panapina_mock_version');
    
    if (currentVersion !== MOCK_DB_VERSION) {
      // Limpiar llaves anteriores de PanaPina para evitar datos corruptos
      Object.keys(MOCK_DB).forEach(key => {
        localStorage.removeItem(`panapina_mock_${key}`);
      });
      localStorage.setItem('panapina_mock_version', MOCK_DB_VERSION);
    }

    Object.keys(MOCK_DB).forEach(key => {
      if (!localStorage.getItem(`panapina_mock_${key}`)) {
        localStorage.setItem(`panapina_mock_${key}`, JSON.stringify(MOCK_DB[key]));
      }
    });
  } catch (e) {
    console.warn('LocalStorage no disponible. Usando base de datos en memoria:', e);
    Object.keys(MOCK_DB).forEach(key => {
      memoryDb[key] = MOCK_DB[key];
    });
  }
};

initLocalDb();

// Métodos de acceso seguros al localStorage / memoria
const getLocalData = (key) => {
  try {
    return JSON.parse(localStorage.getItem(`panapina_mock_${key}`)) || memoryDb[key] || MOCK_DB[key] || [];
  } catch (e) {
    return memoryDb[key] || MOCK_DB[key] || [];
  }
};

const saveLocalData = (key, data) => {
  try {
    localStorage.setItem(`panapina_mock_${key}`, JSON.stringify(data));
  } catch (e) {
    memoryDb[key] = data;
  }
};

// Cliente API Dual (Conecta al backend, si falla cambia a local offline)
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('panapina_token');
  
  // Si el token es de tipo mock/bypass, forzar modo offline de forma inmediata
  if (token === 'mock_jwt_token_pana_pina') {
    offlineMode = true;
    window.isPanapinaOffline = true;
  }
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  // Si ya estamos marcados como offline, ir directo al simulador
  if (offlineMode) {
    return handleOfflineRequest(endpoint, options);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();
    
    if (!response.ok) {
      const err = new Error(data.message || 'Ocurrió un error en la solicitud');
      err.isHttpError = true;
      throw err;
    }
    
    return data;
  } catch (error) {
    if (error.isHttpError) {
      throw error;
    }
    
    // Si falla la conexión física (servidor apagado/error de red), activar modo demo/offline
    console.warn('⚠️ Conexión al backend fallida. Iniciando Modo Demo Local...', error.message);
    offlineMode = true;
    window.isPanapinaOffline = true;
    return handleOfflineRequest(endpoint, options);
  }
}

// Simulador completo de Endpoints del Backend en el cliente
function handleOfflineRequest(endpoint, options) {
  const method = options.method || 'GET';
  const body = options.body 
    ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) 
    : null;
  
  console.log(`[Offline API] ${method} ${endpoint}`, body);

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // 1. AUTENTICACIÓN
      if (endpoint === '/auth/login' && method === 'POST') {
        const usuarios = getLocalData('usuarios');
        const empleados = getLocalData('empleados');
        const user = usuarios.find(u => u.matricula === body.matricula && u.password_hash === body.password);
        
        if (user && user.activo) {
          const emp = empleados.find(e => e.usuario_id === user.id) || { nombre_completo: 'Usuario Local' };
          resolve({
            success: true,
            message: 'Login exitoso (Offline)',
            data: {
              token: 'mock_jwt_token_pana_pina',
              user: {
                id: user.id,
                matricula: user.matricula,
                rol: user.rol,
                email: user.email,
                nombre: emp.nombre_completo,
                telefono: emp.telefono
              }
            }
          });
        } else {
          reject(new Error('Credenciales inválidas. Usa la matrícula AD-PanaPina-001 y clave admin123'));
        }
      }

      else if (endpoint === '/auth/verify' && method === 'GET') {
        resolve({
          success: true,
          message: 'Token válido (Offline)',
          user: { id: 1, matricula: 'AD-PanaPina-001', rol: 'admin', nombre: 'Administrador PanaPina' }
        });
      }

      else if (endpoint === '/auth/profile' && method === 'GET') {
        const emp = getLocalData('empleados')[0];
        resolve({
          success: true,
          data: {
            usuario: { id: 1, matricula: 'AD-PanaPina-001', rol: 'admin', email: 'admin@panapina.local', activo: true },
            empleado: emp
          }
        });
      }

      // 2. PRODUCTOS
      else if (endpoint.startsWith('/productos') && method === 'GET') {
        if (endpoint === '/productos/categorias') {
          resolve({ success: true, data: getLocalData('categorias') });
        } else if (endpoint === '/productos/refri') {
          resolve({ success: true, data: getLocalData('productos_refri') });
        } else if (endpoint === '/productos/tienda') {
          resolve({ success: true, data: getLocalData('productos_tienda') });
        } else if (endpoint.includes('/search')) {
          const q = new URLSearchParams(endpoint.split('?')[1]).get('q').toLowerCase();
          const prods = getLocalData('productos').filter(p => p.nombre.toLowerCase().includes(q));
          resolve({ success: true, data: prods });
        } else {
          // Obtener lista general de panadería
          resolve({ success: true, data: getLocalData('productos') });
        }
      }

      else if (endpoint === '/productos' && method === 'POST') {
        const prods = getLocalData('productos');
        const nuevo = {
          id: prods.length > 0 ? Math.max(...prods.map(p => p.id)) + 1 : 1,
          ...body,
          categoria_nombre: getLocalData('categorias').find(c => c.id === parseInt(body.categoria_id))?.nombre || 'Panadería'
        };
        prods.push(nuevo);
        saveLocalData('productos', prods);
        resolve({ success: true, data: nuevo });
      }

      else if (endpoint.startsWith('/productos/') && method === 'PUT') {
        const id = parseInt(endpoint.split('/')[2]);
        const prods = getLocalData('productos');
        const idx = prods.findIndex(p => p.id === id);
        
        if (endpoint.endsWith('/visibility')) {
          if (idx !== -1) {
            prods[idx].visible = !prods[idx].visible;
            saveLocalData('productos', prods);
            resolve({ success: true, message: `Visibilidad de ${prods[idx].nombre} modificada.`, data: prods[idx] });
          } else {
            reject(new Error('Producto no encontrado'));
          }
        } else {
          if (idx !== -1) {
            prods[idx] = { ...prods[idx], ...body };
            saveLocalData('productos', prods);
            resolve({ success: true, data: prods[idx] });
          } else {
            reject(new Error('Producto no encontrado'));
          }
        }
      }

      // 3. TURNOS (CAJA)
      else if (endpoint === '/turnos/activo' && method === 'GET') {
        const turnos = getLocalData('turnos');
        const activo = turnos.find(t => t.estado === 'abierto');
        if (activo) {
          const ventas = getLocalData('ventas') || [];
          const retiros = getLocalData('retiros_caja') || [];
          
          const ventasDelTurno = ventas.filter(v => v.turno_id === activo.id && v.estado === 'completada');
          const retirosDelTurno = retiros.filter(r => r.turno_id === activo.id);
          
          const ventas_efectivo = ventasDelTurno.filter(v => v.metodo_pago === 'efectivo').reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
          const ventas_tarjeta = ventasDelTurno.filter(v => v.metodo_pago === 'tarjeta').reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
          const retiros_totales = retirosDelTurno.reduce((sum, r) => sum + parseFloat(r.monto || 0), 0);
          const efInicial = parseFloat(activo.efectivo_inicial || 0);

          const activoConTotales = {
            ...activo,
            ventas_efectivo,
            ventas_tarjeta,
            retiros_totales,
            efectivo_calculado: efInicial + ventas_efectivo - retiros_totales
          };
          resolve({ success: true, data: activoConTotales });
        } else {
          reject(new Error('No hay turno activo hoy'));
        }
      }

      else if (endpoint === '/turnos/iniciar' && method === 'POST') {
        const turnos = getLocalData('turnos');
        const activo = turnos.find(t => t.estado === 'abierto');
        if (activo) {
          reject(new Error('Ya tienes un turno activo hoy'));
          return;
        }

        const nuevo = {
          id: turnos.length > 0 ? Math.max(...turnos.map(t => t.id)) + 1 : 1,
          empleado_id: 1,
          empleado_nombre: 'Administrador PanaPina (Local)',
          fecha: new Date().toISOString().split('T')[0],
          tipo_turno: body.tipo_turno,
          hora_inicio: new Date().toTimeString().split(' ')[0],
          efectivo_inicial: parseFloat(body.efectivo_inicial || 0),
          estado: 'abierto',
          total_ventas_monto: 0
        };
        turnos.push(nuevo);
        saveLocalData('turnos', turnos);
        resolve({ success: true, data: nuevo });
      }

      else if (endpoint.startsWith('/turnos/') && endpoint.endsWith('/cerrar') && method === 'POST') {
        const id = parseInt(endpoint.split('/')[2]);
        const turnos = getLocalData('turnos');
        const idx = turnos.findIndex(t => t.id === id);
        
        if (idx !== -1) {
          turnos[idx].estado = 'cerrado';
          turnos[idx].efectivo_final = parseFloat(body.efectivo_final || 0);
          turnos[idx].observaciones = body.observaciones || '';
          
          // Calcular reporte de arqueo
          const ventas = getLocalData('ventas').filter(v => v.turno_id === id && v.estado === 'completada');
          const retiros = getLocalData('retiros_caja').filter(r => r.turno_id === id);
          
          const ventas_totales = ventas.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
          const ventas_efectivo = ventas.filter(v => v.metodo_pago === 'efectivo').reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
          const ventas_tarjeta = ventas.filter(v => v.metodo_pago === 'tarjeta').reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
          const retiros_totales = retiros.reduce((sum, r) => sum + parseFloat(r.monto || 0), 0);
          const efInicial = parseFloat(turnos[idx].efectivo_inicial || 0);
          const calculated = efInicial + ventas_efectivo - retiros_totales;
          
          turnos[idx].total_ventas_monto = ventas_totales;
          saveLocalData('turnos', turnos);
 
          resolve({
            success: true,
            data: {
              turno: turnos[idx],
              cierre_caja: {
                id,
                fecha: turnos[idx].fecha,
                tipo_turno: turnos[idx].tipo_turno,
                empleado: 'Administrador Demo (Local)',
                efectivo_inicial: efInicial,
                ventas_totales,
                ventas_efectivo,
                ventas_tarjeta,
                retiros_totales,
                efectivo_final: turnos[idx].efectivo_final,
                efectivo_calculado: calculated
              }
            }
          });
        } else {
          reject(new Error('Turno no encontrado'));
        }
      }

      else if (endpoint === '/chat' && method === 'POST') {
        const { message } = body;
        const cleanText = message.toLowerCase();
        let botResponse = '';

        if (cleanText.includes('caja') || cleanText.includes('corte') || cleanText.includes('arqueo')) {
          botResponse = 'Para hacer el **corte o arqueo de caja**:\n1. Ve a la pestaña **Caja Registradora**.\n2. En la columna derecha verás la *Auditoría de Caja* en tiempo real.\n3. Cuenta el dinero físico y ponlo en el campo *Efectivo Final Físico*.\n4. Haz clic en **Cerrar Turno**. El sistema calculará la diferencia y te dirá si faltó o sobró dinero automáticamente.';
        } else if (cleanText.includes('retiro') || cleanText.includes('egreso') || cleanText.includes('salida')) {
          botResponse = 'Para **registrar un retiro de efectivo** durante el turno:\n1. Dirígete a la pestaña **Caja Registradora**.\n2. Llena el formulario *Salida de Efectivo* (monto, tipo y motivo).\n3. Haz clic en **Registrar Salida de Efectivo**.';
        } else if (cleanText.includes('pan') || cleanText.includes('catálogo') || cleanText.includes('imágenes')) {
          botResponse = '¡Hemos agregado nuevos panes al catálogo con fotos reales!:\n* 🥐 **Cuernito de Mantequilla** ($12.00 MXN)\n* 🍩 **Dona de Chocolate** ($10.00 MXN)\n* 🍞 **Concha de Chocolate** ($8.50 MXN)\n\nPuedes verlos y cobrarlos en el Punto de Venta (POS).';
        } else if (cleanText.includes('postgres') || cleanText.includes('base de datos') || cleanText.includes('pgadmin')) {
          botResponse = 'Tu base de datos de PostgreSQL está conectada en el puerto **`5433`** con la contraseña **`181818`**.\nEl sistema crea automáticamente la base de datos **`panapina`** y carga todas las tablas de `schema.sql` al iniciar el backend.';
        } else if (cleanText.includes('crear') || cleanText.includes('producto') || cleanText.includes('inventario')) {
          botResponse = 'Para gestionar tu inventario:\n1. Ve a la pestaña **Inventario**.\n2. Ahí puedes ver los stocks actuales, modificar precios, costos y cambiar la disponibilidad de panes o abarrotes.';
        } else {
          botResponse = 'Entiendo. Como tu asistente virtual, puedo guiarte sobre el uso de la panadería.\n\nSi deseas integrar una API de chat real para hablar con clientes o usar inteligencia avanzada, te recomiendo utilizar:\n* 💬 **Tawk.to** (Live Chat Gratuito): [https://www.tawk.to](https://www.tawk.to)\n* 🧠 **Gemini API** (Inteligencia de Google): [https://ai.google.dev](https://ai.google.dev)\n* 💬 **Crisp Chat** (Widget moderno): [https://crisp.chat](https://crisp.chat)';
        }

        resolve({
          success: true,
          response: botResponse
        });
      }

      else if (endpoint.startsWith('/clima') && method === 'GET') {
        const q = new URLSearchParams(endpoint.split('?')[1]);
        const ciudad = q.get('ciudad') || 'Mexico City';
        resolve({
          success: true,
          temperatura: 19.5,
          descripcion: 'nubes dispersas (Simulado Offline)',
          humedad: 64,
          ciudad: ciudad,
          pais: 'MX'
        });
      }

      else if (endpoint.startsWith('/turnos/') && endpoint.endsWith('/retiros') && method === 'POST') {
        const turnoId = parseInt(endpoint.split('/')[2]);
        const retiros = getLocalData('retiros_caja');
        const nuevo = {
          id: retiros.length > 0 ? Math.max(...retiros.map(r => r.id)) + 1 : 1,
          turno_id: turnoId,
          monto: parseFloat(body.monto),
          tipo: body.tipo,
          motivo: body.motivo,
          descripcion: body.descripcion,
          creado_en: new Date().toISOString()
        };
        retiros.push(nuevo);
        saveLocalData('retiros_caja', retiros);
        resolve({ success: true, data: nuevo });
      }

      else if (endpoint.startsWith('/turnos/historial') && method === 'GET') {
        resolve({ success: true, data: getLocalData('turnos') });
      }

      // 4. VENTAS
      else if (endpoint === '/ventas' && method === 'POST') {
        const ventas = getLocalData('ventas');
        const id = ventas.length > 0 ? Math.max(...ventas.map(v => v.id)) + 1 : 1;
        const folio = `V-${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        const turnos = getLocalData('turnos');
        const activo = turnos.find(t => t.estado === 'abierto');

        // Descontar stock local de panes
        const productos = getLocalData('productos');
        body.productos.forEach(item => {
          if (item.tipo === 'pan') {
            const idx = productos.findIndex(p => p.id === item.id);
            if (idx !== -1) {
              productos[idx].stock_actual = Math.max(0, productos[idx].stock_actual - item.cantidad);
            }
          }
        });
        saveLocalData('productos', productos);

        // Armar detalles para el ticket y la venta
        const ticketProductos = body.productos.map(item => {
          let nombre = 'Producto';
          if (item.tipo === 'pan') nombre = productos.find(p => p.id === item.id)?.nombre || nombre;
          else if (item.tipo === 'refri') nombre = getLocalData('productos_refri').find(r => r.id === item.id)?.nombre || nombre;
          else if (item.tipo === 'tienda') nombre = getLocalData('productos_tienda').find(t => t.id === item.id)?.nombre || nombre;
          
          const precio = item.tipo === 'pan' ? (productos.find(p => p.id === item.id)?.precio || 0) : 
                         item.tipo === 'refri' ? (getLocalData('productos_refri').find(r => r.id === item.id)?.precio || 0) :
                         (getLocalData('productos_tienda').find(t => t.id === item.id)?.precio || 0);
                         
          return {
            nombre_producto: nombre,
            cantidad: item.cantidad,
            subtotal: precio * item.cantidad
          };
        });

        const nuevaVenta = {
          id,
          folio,
          total: parseFloat(body.total),
          pago_recibido: parseFloat(body.pago_recibido),
          cambio: parseFloat(body.pago_recibido) - parseFloat(body.total),
          metodo_pago: body.metodo_pago,
          estado: 'completada',
          turno_id: activo ? activo.id : null,
          creado_en: new Date().toISOString(),
          productos: ticketProductos
        };

        // Sumar al acumulado del turno si está activo
        if (activo) {
          const tIdx = turnos.findIndex(t => t.id === activo.id);
          turnos[tIdx].total_ventas_monto = (turnos[tIdx].total_ventas_monto || 0) + nuevaVenta.total;
          saveLocalData('turnos', turnos);
        }

        ventas.push(nuevaVenta);
        saveLocalData('ventas', ventas);

        resolve({
          success: true,
          data: {
            venta: nuevaVenta,
            ticket: {
              folio,
              fecha: nuevaVenta.creado_en,
              productos: ticketProductos,
              total: nuevaVenta.total,
              pago_recibido: nuevaVenta.pago_recibido,
              cambio: nuevaVenta.cambio
            }
          }
        });
      }

      else if (endpoint.startsWith('/ventas') && method === 'GET') {
        resolve({
          success: true,
          data: getLocalData('ventas'),
          pagination: { page: 1, limit: 20, total: getLocalData('ventas').length, totalPages: 1 }
        });
      }

      // 5. EMPLEADOS
      else if (endpoint === '/empleados' && method === 'GET') {
        resolve({ success: true, data: getLocalData('empleados') });
      }

      else if (endpoint === '/empleados' && method === 'POST') {
        const emps = getLocalData('empleados');
        const usrs = getLocalData('usuarios');
        
        const nuevoUsuarioId = usrs.length > 0 ? Math.max(...usrs.map(u => u.id)) + 1 : 1;
        const nuevoEmpId = emps.length > 0 ? Math.max(...emps.map(e => e.id)) + 1 : 1;
        
        const matricula = `EM-PanaPina-${nuevoEmpId.toString().padStart(3, '0')}`;

        const nuevoUsuario = {
          id: nuevoUsuarioId,
          matricula,
          email: body.email,
          password_hash: body.password || '123456',
          rol: body.rol || 'empleado',
          activo: true
        };

        const nuevoEmpleado = {
          id: nuevoEmpId,
          usuario_id: nuevoUsuarioId,
          nombre_completo: body.nombre_completo,
          fecha_nacimiento: body.fecha_nacimiento,
          telefono: body.telefono,
          matricula,
          email: body.email,
          rol: body.rol || 'empleado',
          activo: true,
          edad: 28
        };

        usrs.push(nuevoUsuario);
        emps.push(nuevoEmpleado);
        
        saveLocalData('usuarios', usrs);
        saveLocalData('empleados', emps);

        resolve({
          success: true,
          data: {
            empleado: nuevoEmpleado,
            usuario: nuevoUsuario
          }
        });
      }

      else if (endpoint.startsWith('/empleados/') && method === 'PUT') {
        const id = parseInt(endpoint.split('/')[2]);
        const emps = getLocalData('empleados');
        const idx = emps.findIndex(e => e.id === id);
        if (idx !== -1) {
          emps[idx] = { ...emps[idx], ...body };
          saveLocalData('empleados', emps);
          resolve({ success: true, data: emps[idx] });
        } else {
          reject(new Error('Empleado no encontrado'));
        }
      }

      else if (endpoint.startsWith('/empleados/') && method === 'DELETE') {
        const id = parseInt(endpoint.split('/')[2]);
        const emps = getLocalData('empleados');
        const idx = emps.findIndex(e => e.id === id);
        if (idx !== -1) {
          emps[idx].activo = false;
          saveLocalData('empleados', emps);
          resolve({ success: true, message: 'Empleado desactivado' });
        } else {
          reject(new Error('Empleado no encontrado'));
        }
      }

      // 6. REPORTES
      else if (endpoint.startsWith('/reportes') && method === 'GET') {
        const ventas = getLocalData('ventas').filter(v => v.estado === 'completada');
        
        if (endpoint.includes('/ventas-diarias')) {
          // Agrupar ventas por fecha
          const grupos = {};
          ventas.forEach(v => {
            const fecha = v.creado_en.split('T')[0];
            if (!grupos[fecha]) {
              grupos[fecha] = { fecha, total_ventas: 0, ingreso_total: 0 };
            }
            grupos[fecha].total_ventas += 1;
            grupos[fecha].ingreso_total += v.total;
          });
          resolve({ success: true, data: Object.values(grupos) });
        }
        
        else if (endpoint.includes('/productos-mas-vendidos')) {
          // Simular lista estática o calculada
          resolve({
            success: true,
            data: [
              { nombre_producto: 'Bolillo', tipo_producto: 'pan', total_vendido: 48, ingreso_generado: 168.00 },
              { nombre_producto: 'Concha vainilla', tipo_producto: 'pan', total_vendido: 30, ingreso_generado: 240.00 },
              { nombre_producto: 'Oreja', tipo_producto: 'pan', total_vendido: 15, ingreso_generado: 150.00 }
            ]
          });
        }
        
        else if (endpoint.includes('/cierre-caja')) {
          resolve({ success: true, data: [] });
        }
        
        else if (endpoint.includes('/inventario')) {
          const prods = getLocalData('productos');
          const totalVal = prods.reduce((sum, p) => sum + (p.precio * p.stock_actual), 0);
          resolve({
            success: true,
            data: {
              bajo_stock: prods.filter(p => p.stock_actual <= p.stock_minimo),
              mas_vendidos_hoy: [],
              estadisticas: {
                total_productos: prods.length,
                productos_bajo_stock: prods.filter(p => p.stock_actual <= p.stock_minimo).length,
                total_piezas: prods.reduce((sum, p) => sum + p.stock_actual, 0),
                valor_inventario: totalVal
              }
            }
          });
        }
        
        else if (endpoint.includes('/financiero-mensual')) {
          const totalEfectivo = ventas.filter(v => v.metodo_pago === 'efectivo').reduce((sum, v) => sum + v.total, 0);
          const totalTarjeta = ventas.filter(v => v.metodo_pago === 'tarjeta').reduce((sum, v) => sum + v.total, 0);
          
          resolve({
            success: true,
            data: {
              ventas_por_dia: [],
              metodos_pago: [
                { metodo_pago: 'efectivo', total_ventas: 1, monto_total: totalEfectivo || 250 },
                { metodo_pago: 'tarjeta', total_ventas: 1, monto_total: totalTarjeta || 180 }
              ]
            }
          });
        }
      }

      // 7. PEDIDOS EN LÍNEA
      else if (endpoint === '/pedidos' && method === 'POST') {
        const pedidos = getLocalData('pedidos') || [];
        const ordenCod = `PP-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        const nuevoPedido = {
          id: pedidos.length > 0 ? Math.max(...pedidos.map(p => p.id)) + 1 : 1,
          orden: ordenCod,
          cliente: body.cliente,
          telefono: body.telefono,
          hora_recogida: body.hora_recogida,
          notas: body.notas,
          productos: body.productos,
          total: parseFloat(body.total),
          estado: 'pendiente',
          creado_en: new Date().toISOString()
        };
        pedidos.push(nuevoPedido);
        saveLocalData('pedidos', pedidos);
        
        // Sincronizar también con la llave vieja por compatibilidad
        localStorage.setItem('panapina_mock_pedidos', JSON.stringify(pedidos));
        
        resolve({ success: true, data: nuevoPedido });
      }

      else if (endpoint.startsWith('/pedidos/cliente') && method === 'GET') {
        const telefono = new URLSearchParams(endpoint.split('?')[1]).get('telefono');
        const pedidos = getLocalData('pedidos') || [];
        const filtrados = pedidos.filter(p => p.telefono === telefono);
        resolve({ success: true, data: filtrados });
      }

      else if (endpoint.startsWith('/pedidos') && method === 'GET') {
        const queryParams = endpoint.includes('?') ? new URLSearchParams(endpoint.split('?')[1]) : null;
        const estado = queryParams ? queryParams.get('estado') : null;
        
        let pedidos = getLocalData('pedidos') || [];
        if (estado) {
          pedidos = pedidos.filter(p => p.estado === estado);
        }
        resolve({ success: true, data: pedidos });
      }

      else if (endpoint.startsWith('/pedidos/') && endpoint.endsWith('/estado') && method === 'PUT') {
        const id = parseInt(endpoint.split('/')[2]);
        const pedidos = getLocalData('pedidos') || [];
        const idx = pedidos.findIndex(p => p.id === id);
        
        if (idx !== -1) {
          pedidos[idx].estado = body.estado;
          saveLocalData('pedidos', pedidos);
          localStorage.setItem('panapina_mock_pedidos', JSON.stringify(pedidos));
          resolve({ success: true, data: pedidos[idx] });
        } else {
          reject(new Error('Pedido no encontrado'));
        }
      }

      else {
        reject(new Error('Endpoint no soportado en modo offline'));
      }
    }, 300);
  });
}

export const api = {
  // Autenticación
  auth: {
    login: (matricula, password) => 
      request('/auth/login', { method: 'POST', body: { matricula, password } }),
    getProfile: () => 
      request('/auth/profile'),
    changePassword: (currentPassword, newPassword) => 
      request('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
    verifyToken: () => 
      request('/auth/verify'),
  },

  // Productos
  productos: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.tipo) params.append('tipo', filters.tipo);
      if (filters.categoria) params.append('categoria', filters.categoria);
      if (filters.visible !== undefined) params.append('visible', filters.visible);
      
      const query = params.toString() ? `?${params.toString()}` : '';
      return request(`/productos${query}`);
    },
    getById: (id) => 
      request(`/productos/${id}`),
    create: (data) => 
      request('/productos', { method: 'POST', body: data }),
    update: (id, data) => 
      request(`/productos/${id}`, { method: 'PUT', body: data }),
    toggleVisibility: (id) => 
      request(`/productos/${id}/visibility`, { method: 'PUT' }),
    getCategorias: () => 
      request('/productos/categorias'),
    getRefri: () => 
      request('/productos/refri'),
    getTienda: () => 
      request('/productos/tienda'),
    search: (query) => 
      request(`/productos/search?q=${encodeURIComponent(query)}`),
  },

  // Ventas
  ventas: {
    create: (data) => 
      request('/ventas', { method: 'POST', body: data }),
    getAll: (fecha, page = 1) => {
      const query = `?page=${page}${fecha ? `&fecha=${fecha}` : ''}`;
      return request(`/ventas${query}`);
    },
    getById: (id) => 
      request(`/ventas/${id}`),
    cancel: (id, razon) => 
      request(`/ventas/${id}/cancelar`, { method: 'POST', body: { razon } }),
  },

  // Turnos (Caja)
  turnos: {
    iniciar: (tipo_turno, efectivo_inicial) => 
      request('/turnos/iniciar', { method: 'POST', body: { tipo_turno, efectivo_inicial } }),
    cerrar: (id, efectivo_final, observaciones) => 
      request(`/turnos/${id}/cerrar`, { method: 'POST', body: { efectivo_final, observaciones } }),
    getActivo: () => 
      request('/turnos/activo'),
    getHistorial: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.fecha) params.append('fecha', filters.fecha);
      if (filters.empleado_id) params.append('empleado_id', filters.empleado_id);
      if (filters.page) params.append('page', filters.page);
      
      const query = params.toString() ? `?${params.toString()}` : '';
      return request(`/turnos/historial${query}`);
    },
    registrarRetiro: (turnoId, data) => 
      request(`/turnos/${turnoId}/retiros`, { method: 'POST', body: data }),
  },

  // Empleados
  empleados: {
    getAll: () => 
      request('/empleados'),
    create: (data) => 
      request('/empleados', { method: 'POST', body: data }),
    update: (id, data) => 
      request(`/empleados/${id}`, { method: 'PUT', body: data }),
    delete: (id) => 
      request(`/empleados/${id}`, { method: 'DELETE' }),
    getById: (id) => 
      request(`/empleados/${id}`),
  },

  // Reportes
  reportes: {
    ventasDiarias: (fechaInicio, fechaFin) => {
      const query = `?fecha_inicio=${fechaInicio || ''}&fecha_fin=${fechaFin || ''}`;
      return request(`/reportes/ventas-diarias${query}`);
    },
    productosMasVendidos: (fechaInicio, fechaFin, limite = 10) => {
      const query = `?fecha_inicio=${fechaInicio || ''}&fecha_fin=${fechaFin || ''}&limite=${limite}`;
      return request(`/reportes/productos-mas-vendidos${query}`);
    },
    cierreCaja: (fecha) => {
      const query = fecha ? `?fecha=${fecha}` : '';
      return request(`/reportes/cierre-caja${query}`);
    },
    inventario: () => 
      request('/reportes/inventario'),
    financieroMensual: (año, mes) => {
      const query = `?año=${año || ''}&mes=${mes || ''}`;
      return request(`/reportes/financiero-mensual${query}`);
    },
  },

  // Pedidos en línea
  pedidos: {
    create: (data) => 
      request('/pedidos', { method: 'POST', body: data }),
    getByPhone: (telefono) => 
      request(`/pedidos/cliente?telefono=${encodeURIComponent(telefono)}`),
    getAll: (estado) => {
      const query = estado ? `?estado=${estado}` : '';
      return request(`/pedidos${query}`);
    },
    updateEstado: (id, estado) => 
      request(`/pedidos/${id}/estado`, { method: 'PUT', body: { estado } }),
  },
  
  // Chatbot API
  chat: {
    send: (message) => 
      request('/chat', { method: 'POST', body: { message } }),
  },
  
  // Clima API con API Key Seguro
  clima: {
    get: (ciudad) => 
      request(`/clima?ciudad=${encodeURIComponent(ciudad || '')}`),
  }
};
