import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Sparkles, 
  ShoppingBag, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Clock, 
  CheckCircle, 
  ArrowLeft
} from 'lucide-react';

export const ClientPortal = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  
  // Vista activa: 'catalog' o 'my-orders'
  const [activeTab, setActiveTab] = useState('catalog');
  const [activeCategory, setActiveCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Carrito del cliente
  const [cart, setCart] = useState([]);
  
  // Formulario del cliente
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [horaRecogida, setHoraRecogida] = useState('18:00');
  const [notas, setNotas] = useState('');

  // Orden completada
  const [orderSummary, setOrderSummary] = useState(null);
  
  // Consulta de Mis Pedidos
  const [searchPhone, setSearchPhone] = useState('');
  const [myOrdersList, setMyOrdersList] = useState([]);
  const [searchingOrders, setSearchingOrders] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarCatalogo();
  }, []);

  const cargarCatalogo = async () => {
    setLoading(true);
    try {
      const resProds = await api.productos.getAll({ visible: 'true' });
      const resCats = await api.productos.getCategorias();
      
      if (resProds.success) setProductos(resProds.data.map(p => ({ ...p, tipo: 'pan' })));
      if (resCats.success) setCategorias(resCats.data);
    } catch (err) {
      console.error('Error al cargar catálogo de clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredProducts = () => {
    let filtrados = productos;
    if (activeCategory !== 'todos') {
      filtrados = productos.filter(p => p.categoria_nombre === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtrados = filtrados.filter(p => p.nombre.toLowerCase().includes(q));
    }
    return filtrados;
  };

  const addToCart = (product) => {
    if (product.stock_actual <= 0) {
      setMensaje({ tipo: 'warning', texto: 'Producto agotado temporalmente en tienda' });
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
      return;
    }

    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.cantidad >= product.stock_actual) {
          setMensaje({ tipo: 'warning', texto: `Lo sentimos, solo disponemos de ${product.stock_actual} piezas de ${product.nombre}.` });
          setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
          return prev;
        }
        return prev.map(i => i.id === product.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { ...product, cantidad: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing.cantidad === 1) {
        return prev.filter(i => i.id !== id);
      }
      return prev.map(i => i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i);
    });
  };

  const deleteFromCart = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + parseFloat(item.precio) * item.cantidad, 0);
  };

  // Enviar Pedido
  const handleConfirmarPedido = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!clienteNombre.trim() || !clienteTelefono.trim()) {
      setMensaje({ tipo: 'danger', texto: 'Por favor completa tu nombre y número de teléfono.' });
      return;
    }

    setLoading(true);
    try {
      const total = getCartTotal();
      const nuevoPedido = {
        cliente: clienteNombre,
        telefono: clienteTelefono,
        hora_recogida: horaRecogida,
        notes: notas,
        notas: notas,
        productos: cart.map(i => ({
          id: i.id,
          nombre: i.nombre,
          cantidad: i.cantidad,
          precio: parseFloat(i.precio),
          tipo: 'pan'
        })),
        total
      };

      const res = await api.pedidos.create(nuevoPedido);
      if (res.success) {
        setOrderSummary(res.data);
        setCart([]);
        setClienteNombre('');
        setClienteTelefono('');
        setNotas('');
        cargarCatalogo();
      } else {
        setMensaje({ tipo: 'danger', texto: res.message || 'Error al procesar tu pedido' });
        setTimeout(() => setMensaje({ tipo: '', texto: '' }), 4000);
      }
    } catch (err) {
      console.error('Error al guardar pedido:', err);
      setMensaje({ tipo: 'danger', texto: `Error al enviar tu pedido: ${err.message || 'Intente de nuevo.'}` });
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 6000);
    } finally {
      setLoading(false);
    }
  };

  // Buscar pedidos por Teléfono
  const buscarMisPedidos = async (e) => {
    e.preventDefault();
    if (!searchPhone.trim()) return;
    setSearchingOrders(true);
    setHasSearched(true);
    try {
      const res = await api.pedidos.getByPhone(searchPhone);
      if (res.success) {
        setMyOrdersList(res.data);
      } else {
        setMensaje({ tipo: 'danger', texto: res.message || 'Error al buscar tus pedidos.' });
        setTimeout(() => setMensaje({ tipo: '', texto: '' }), 4000);
      }
    } catch (err) {
      console.error('Error al buscar pedidos:', err);
      setMensaje({ tipo: 'danger', texto: 'No se pudieron recuperar tus pedidos.' });
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 4000);
    } finally {
      setSearchingOrders(false);
    }
  };

  return (
    <div style={styles.pageWrapper}>
      {/* HEADER DE CLIENTE */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <a href="/login" style={styles.backBtn} title="Volver al Portal Interno">
            <ArrowLeft size={16} />
            <span>Portal Interno</span>
          </a>

          {/* TABS DE CLIENTE */}
          <div style={styles.tabSwitcher}>
            <button 
              onClick={() => { setActiveTab('catalog'); setOrderSummary(null); }} 
              style={{
                ...styles.tabSwitchBtn,
                ...(activeTab === 'catalog' ? styles.tabSwitchBtnActive : {})
              }}
            >
              🛍️ Ver Menú de Panes
            </button>
            <button 
              onClick={() => { setActiveTab('my-orders'); setOrderSummary(null); }} 
              style={{
                ...styles.tabSwitchBtn,
                ...(activeTab === 'my-orders' ? styles.tabSwitchBtnActive : {})
              }}
            >
              🕒 Consultar Mis Pedidos
            </button>
          </div>

          <div style={styles.logoGroup}>
            <div style={styles.logoWrapper}>
              <Sparkles size={20} color="#fff" />
            </div>
            <div>
              <h1 className="brand-title" style={styles.brandTitle}>PanaPina</h1>
              <span style={styles.brandSub}>Pedidos en Línea</span>
            </div>
          </div>
        </div>
      </header>

      {/* MENSAJES DE ALERTA */}
      {mensaje.texto && (
        <div className={`alert alert-${mensaje.tipo}`} style={styles.floatingAlert}>
          {mensaje.texto}
        </div>
      )}

      {/* PANTALLA DE CONFIRMACIÓN DE PEDIDO */}
      {orderSummary ? (
        <div style={styles.confirmContainer}>
          <div className="card" style={styles.confirmCard}>
            <div style={styles.confirmIconWrapper}>
              <CheckCircle size={48} color="var(--success)" />
            </div>
            <h2 className="brand-title" style={{ fontSize: '24px', marginTop: '16px', color: 'var(--secondary)' }}>
              ¡Pedido Recibido con Éxito!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '8px 0 24px 0' }}>
              Tu pan ha sido reservado. Pasa a recogerlo y págalo directamente en el mostrador de la panadería.
            </p>

            <div style={styles.summaryBox}>
              <div style={styles.summaryRow}>
                <span>Código de Orden:</span>
                <strong style={{ color: 'var(--primary)', fontSize: '18px' }}>{orderSummary.orden}</strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Cliente:</span>
                <strong>{orderSummary.cliente}</strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Hora de Recogida:</span>
                <strong>{orderSummary.hora_recogida} hrs</strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Total a Pagar en Caja:</span>
                <strong style={{ fontSize: '16px' }}>${orderSummary.total.toFixed(2)}</strong>
              </div>
            </div>

            <div style={styles.ticketItemsList}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Resumen de Productos:
              </span>
              {orderSummary.productos.map((item, idx) => (
                <div key={idx} style={styles.ticketItemMini}>
                  <span>{item.nombre || item.nombre_producto} x{item.cantidad}</span>
                  <span>${(parseFloat(item.precio || item.precio_unitario) * item.cantidad).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => { setOrderSummary(null); setActiveTab('catalog'); }} 
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '24px' }}
            >
              Volver al Catálogo
            </button>
          </div>
        </div>
      ) : activeTab === 'my-orders' ? (
        /* PANTALLA: CONSULTA DE MIS PEDIDOS */
        <div style={styles.myOrdersLayout}>
          <div className="card" style={{ padding: '32px', textAlign: 'left', maxWidth: '680px', width: '100%', margin: '0 auto' }}>
            <h2 className="brand-title" style={{ fontSize: '26px', color: 'var(--secondary)', marginBottom: '8px' }}>Mis Pedidos</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
              Escribe tu número de teléfono registrado al realizar tu pedido para rastrear su estado.
            </p>
            
            <form onSubmit={buscarMisPedidos} style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
              <input 
                type="tel"
                className="form-input"
                placeholder="Teléfono (ej. 5550000001)"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                required
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" disabled={searchingOrders} style={{ minWidth: '140px' }}>
                {searchingOrders ? 'Buscando...' : 'Buscar Pedidos'}
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {myOrdersList.length === 0 ? (
                hasSearched && (
                  <div style={{ textAlign: 'center', padding: '32px 16px', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                    No se encontraron pedidos pendientes o completados para este teléfono.
                  </div>
                )
              ) : (
                myOrdersList.map(pedido => (
                  <div key={pedido.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--background)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
                      <div>
                        <strong style={{ fontSize: '16px', color: 'var(--primary)' }}>Orden: {pedido.orden}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Realizado: {new Date(pedido.creado_en).toLocaleString('es-MX')}
                        </div>
                      </div>
                      <div>
                        <span 
                          className={`badge ${
                            pedido.estado === 'pendiente' ? 'badge-warning' : 
                            pedido.estado === 'completado' ? 'badge-success' : 'badge-danger'
                          }`}
                          style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700' }}
                        >
                          {pedido.estado === 'pendiente' ? '🕒 Preparando / Listo para recoger' : 
                           pedido.estado === 'completado' ? '✅ Entregado y Pagado' : '❌ Cancelado'}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                      <div><strong>Cliente:</strong> {pedido.cliente}</div>
                      <div><strong>Hora de Recogida Pactada:</strong> {pedido.hora_recogida} hrs</div>
                      {pedido.notas && <div style={{ color: 'var(--primary)', fontStyle: 'italic' }}><strong>Nota:</strong> "{pedido.notas}"</div>}
                    </div>

                    <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '10px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Productos:</span>
                      {pedido.productos.map((prod, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '4px 0', fontFamily: 'monospace' }}>
                          <span>{prod.nombre} x{prod.cantidad}</span>
                          <span>${(parseFloat(prod.precio) * prod.cantidad).toFixed(2)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '8px', fontWeight: '800', fontSize: '14px' }}>
                        <span>Total:</span>
                        <span>${pedido.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* PANTALLA PRINCIPAL: CATÁLOGO Y CARRITO */
        <div style={styles.mainLayout}>
          {/* COLUMNA IZQUIERDA: CATÁLOGO */}
          <div style={styles.catalogoColumn}>
            <div style={styles.catalogHero}>
              <h2 className="brand-title" style={styles.heroText}>El Pan Caliente de Hoy</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                Reserva tus panes favoritos en línea y recógelos recién salidos del horno.
              </p>
            </div>

            {/* BUSCADOR Y CATEGORÍAS */}
            <div style={styles.filterBar}>
              <div style={styles.searchWrapper}>
                <Search size={18} style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Buscar conchas, bolillos, orejas..."
                  className="form-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '44px' }}
                />
              </div>

              <div style={styles.tabContainer}>
                <button 
                  onClick={() => setActiveCategory('todos')}
                  style={{
                    ...styles.tabBtn,
                    ...(activeCategory === 'todos' ? styles.tabBtnActive : {})
                  }}
                >
                  Todos los Panes
                </button>
                {categorias.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.nombre)}
                    style={{
                      ...styles.tabBtn,
                      ...(activeCategory === cat.nombre ? styles.tabBtnActive : {})
                    }}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>
            </div>

            {/* GRID DE PANES */}
            <div style={styles.productsGrid}>
              {getFilteredProducts().map((product) => {
                const isOut = product.stock_actual <= 0;
                return (
                  <div 
                    key={product.id}
                    onClick={() => !isOut && addToCart(product)}
                    className="card card-hoverable"
                    style={{
                      ...styles.productCard,
                      ...(isOut ? styles.productCardDisabled : {})
                    }}
                  >
                    {product.imagen_url ? (
                      <img src={product.imagen_url} alt={product.nombre} style={styles.productImg} />
                    ) : (
                      <div style={styles.productPlaceholder}>🥐</div>
                    )}
                    
                    <div style={styles.productInfo}>
                      <span style={styles.productCat}>{product.categoria_nombre}</span>
                      <h3 style={styles.productName}>{product.nombre}</h3>
                      <p style={styles.productDesc}>{product.descripcion}</p>
                      
                      <div style={styles.productBottom}>
                        <span style={styles.productPrice}>${parseFloat(product.precio).toFixed(2)}</span>
                        <span 
                          style={{
                            ...styles.productStock,
                            color: isOut ? 'var(--danger)' : 'var(--success)'
                          }}
                        >
                          {isOut ? 'Agotado' : 'Disponible'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {getFilteredProducts().length === 0 && (
                <div style={styles.emptyCatalog}>
                  <ShoppingBag size={32} color="var(--text-muted)" />
                  <p>No hay panes disponibles en esta categoría por el momento.</p>
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: RESERVA / CARRITO */}
          <div style={styles.cartColumn}>
            <div style={styles.cartHeader}>
              <ShoppingBag size={20} color="var(--primary)" />
              <h2 style={{ fontSize: '18px' }}>Tu Canasta de Pan</h2>
            </div>

            {/* PRODUCTOS SELECCIONADOS */}
            <div style={styles.cartList}>
              {cart.length === 0 ? (
                <div style={styles.emptyCart}>
                  <span style={{ fontSize: '32px' }}>🥖</span>
                  <span style={{ fontWeight: '700', marginTop: '12px' }}>Tu canasta está vacía</span>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Agrega panes del catálogo de la izquierda para armar tu pedido.
                  </p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} style={styles.cartItem}>
                    <div style={styles.cartItemInfo}>
                      <span style={styles.cartItemName}>{item.nombre}</span>
                      <span style={styles.cartItemSub}>${parseFloat(item.precio).toFixed(2)} c/u</span>
                    </div>

                    <div style={styles.cartItemActions}>
                      <button onClick={() => removeFromCart(item.id)} style={styles.countBtn}>
                        <Minus size={10} />
                      </button>
                      <span style={styles.itemQty}>{item.cantidad}</span>
                      <button onClick={() => addToCart(item)} style={styles.countBtn}>
                        <Plus size={10} />
                      </button>
                      <span style={styles.itemTotal}>
                        ${(parseFloat(item.precio) * item.cantidad).toFixed(2)}
                      </span>
                      <button onClick={() => deleteFromCart(item.id)} style={styles.deleteBtn}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* FORMULARIO DE CHECKOUT */}
            {cart.length > 0 && (
              <form onSubmit={handleConfirmarPedido} style={styles.checkoutForm}>
                <div style={styles.totalRow}>
                  <span>Total Pedido:</span>
                  <strong style={{ fontSize: '20px', color: 'var(--primary)' }}>
                    ${getCartTotal().toFixed(2)}
                  </strong>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '14px 0' }} />

                <div className="form-group">
                  <label className="form-label">Tu Nombre</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Familia Rodríguez"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Teléfono de Contacto</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="Ej. 5550000001"
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Hora Estimada de Recogida</label>
                  <div style={styles.timeInputWrapper}>
                    <Clock size={16} style={styles.timeIcon} />
                    <select
                      className="form-input form-select"
                      value={horaRecogida}
                      onChange={(e) => setHoraRecogida(e.target.value)}
                      style={{ paddingLeft: '40px' }}
                    >
                      <option value="08:00">08:00 AM</option>
                      <option value="09:00">09:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="16:00">04:00 PM</option>
                      <option value="17:00">05:00 PM</option>
                      <option value="18:00">06:00 PM</option>
                      <option value="19:00">07:00 PM</option>
                      <option value="20:00">08:00 PM</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notas Especiales (Opcional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Conchas con extra azúcar..."
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px', padding: '12px' }} disabled={loading}>
                  <span>Confirmar y Reservar Pan</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  pageWrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--background)'
  },
  header: {
    height: '80px',
    backgroundColor: 'var(--card-bg)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 32px',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  headerContent: {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--text-muted)',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '700',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--card-bg)',
    transition: 'all 0.2s ease'
  },
  tabSwitcher: {
    display: 'flex',
    gap: '4px',
    backgroundColor: 'var(--background)',
    padding: '4px',
    borderRadius: '10px',
    border: '1px solid var(--border)'
  },
  tabSwitchBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  tabSwitchBtnActive: {
    backgroundColor: 'var(--card-bg)',
    color: 'var(--primary-hover)',
    boxShadow: 'var(--shadow-sm)'
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoWrapper: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 8px rgba(180, 83, 9, 0.25)'
  },
  brandTitle: {
    fontSize: '18px',
    color: 'var(--secondary)',
    lineHeight: '1.1'
  },
  brandSub: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  floatingAlert: {
    position: 'fixed',
    top: '90px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 200,
    boxShadow: 'var(--shadow-md)'
  },
  mainLayout: {
    flex: 1,
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px',
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: '32px',
    alignItems: 'stretch'
  },
  myOrdersLayout: {
    flex: 1,
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px',
    display: 'flex',
    justifyContent: 'center'
  },
  catalogoColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  catalogHero: {
    textAlign: 'left'
  },
  heroText: {
    fontSize: '28px',
    color: 'var(--secondary)'
  },
  filterBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    color: 'var(--text-muted)'
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  tabBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--card-bg)',
    color: 'var(--text-muted)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  tabBtnActive: {
    background: 'var(--primary)',
    borderColor: 'var(--primary)',
    color: '#fff'
  },
  productsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
    gap: '20px'
  },
  productCard: {
    padding: '12px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    textAlign: 'left'
  },
  productCardDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    pointerEvents: 'none'
  },
  productImg: {
    width: '100%',
    height: '130px',
    objectFit: 'cover',
    borderRadius: '10px'
  },
  productPlaceholder: {
    width: '100%',
    height: '130px',
    backgroundColor: 'var(--primary-light)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '36px'
  },
  productInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },
  productCat: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  productName: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--secondary)',
    margin: '2px 0 4px 0'
  },
  productDesc: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    lineHeight: '1.3',
    height: '32px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  productBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto'
  },
  productPrice: {
    fontSize: '16px',
    fontWeight: '800',
    color: 'var(--primary)'
  },
  productStock: {
    fontSize: '10px',
    fontWeight: '700'
  },
  emptyCatalog: {
    gridColumn: '1 / -1',
    padding: '48px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: 'var(--text-muted)'
  },
  cartColumn: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-sm)',
    padding: '24px'
  },
  cartHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '12px',
    marginBottom: '16px'
  },
  cartList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    flex: 1,
    overflowY: 'auto',
    maxHeight: '320px',
    marginBottom: '16px'
  },
  emptyCart: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
    color: 'var(--text-muted)',
    textAlign: 'center'
  },
  cartItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border)'
  },
  cartItemInfo: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left'
  },
  cartItemName: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--secondary)'
  },
  cartItemSub: {
    fontSize: '11px',
    color: 'var(--text-muted)'
  },
  cartItemActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  countBtn: {
    width: '20px',
    height: '20px',
    borderRadius: '5px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--background)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  itemQty: {
    fontSize: '12px',
    fontWeight: '700',
    width: '16px',
    textAlign: 'center'
  },
  itemTotal: {
    fontSize: '13px',
    fontWeight: '700',
    marginLeft: 'auto',
    marginRight: '8px'
  },
  deleteBtn: {
    border: 'none',
    background: 'none',
    color: 'var(--danger)',
    cursor: 'pointer'
  },
  checkoutForm: {
    display: 'flex',
    flexDirection: 'column'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '15px',
    fontWeight: '700'
  },
  timeInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  timeIcon: {
    position: 'absolute',
    left: '14px',
    color: 'var(--text-muted)'
  },
  confirmContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    flex: 1
  },
  confirmCard: {
    width: '100%',
    maxWidth: '480px',
    textAlign: 'center',
    padding: '40px'
  },
  confirmIconWrapper: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'var(--success-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto'
  },
  summaryBox: {
    backgroundColor: 'var(--background)',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    textAlign: 'left',
    marginBottom: '20px'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: 'var(--text-main)'
  },
  ticketItemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    textAlign: 'left',
    padding: '12px',
    border: '1px dashed var(--border)',
    borderRadius: '8px'
  },
  ticketItemMini: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    fontFamily: 'monospace'
  }
};
