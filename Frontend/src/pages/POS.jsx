import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  DollarSign, 
  CreditCard, 
  Receipt,
  AlertTriangle,
  Lock,
  Compass
} from 'lucide-react';

export const POS = () => {
  const { turnoActivo } = useAuth();
  
  // Catálogos de productos
  const [productosPan, setProductosPan] = useState([]);
  const [productosRefri, setProductosRefri] = useState([]);
  const [productosTienda, setProductosTienda] = useState([]);
  const [productosTodo, setProductosTodo] = useState([]);
  
  // Categoría seleccionada en la vista
  const [activeCategory, setActiveCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Carrito de compras
  const [cart, setCart] = useState([]);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [pagoRecibido, setPagoRecibido] = useState('');
  
  // Modal de Ticket / Compra completada
  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState(null);

  // Estados generales
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    cargarProductos();
  }, []);


  const cargarProductos = async () => {
    setLoading(true);
    try {
      // Cargar productos de panadería, refrigerador y tienda en paralelo
      const [resPan, resRefri, resTienda] = await Promise.all([
        api.productos.getAll({ visible: 'true' }),
        api.productos.getRefri(),
        api.productos.getTienda()
      ]);

      const panItems = (resPan.data || []).map(p => ({
        ...p,
        tipo: 'pan',
        categoria_display: p.categoria_nombre || 'Panadería'
      }));

      const refriItems = (resRefri.data || []).map(r => ({
        ...r,
        tipo: 'refri',
        categoria_display: 'Refrigerador'
      }));

      const tiendaItems = (resTienda.data || []).map(t => ({
        ...t,
        tipo: 'tienda',
        categoria_display: 'Tienda'
      }));

      const combinados = [...panItems, ...refriItems, ...tiendaItems];
      setProductosPan(panItems);
      setProductosRefri(refriItems);
      setProductosTienda(tiendaItems);
      setProductosTodo(combinados);
    } catch (err) {
      console.error('Error al cargar productos para POS:', err);
      setMensaje({ tipo: 'danger', texto: 'Error al conectar con la base de datos de catálogo.' });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredProducts = () => {
    let filtrados = productosTodo;

    // Filtrar por categoría
    if (activeCategory === 'pan') {
      filtrados = productosPan;
    } else if (activeCategory === 'refri') {
      filtrados = productosRefri;
    } else if (activeCategory === 'tienda') {
      filtrados = productosTienda;
    }

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtrados = filtrados.filter(p => 
        p.nombre.toLowerCase().includes(q) || 
        (p.descripcion && p.descripcion.toLowerCase().includes(q))
      );
    }

    return filtrados;
  };

  // Carrito de Compras
  const addToCart = (product) => {
    // Si el stock actual es 0 (para panes que tienen control de stock)
    if (product.tipo === 'pan' && product.stock_actual <= 0) {
      setMensaje({ tipo: 'warning', texto: `El producto ${product.nombre} no cuenta con stock disponible.` });
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
      return;
    }

    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id && item.tipo === product.tipo);
      if (existing) {
        // Validar límite de stock si es tipo pan
        if (product.tipo === 'pan' && existing.cantidad >= product.stock_actual) {
          setMensaje({ tipo: 'warning', texto: `No puedes agregar más de ${product.stock_actual} piezas de ${product.nombre}.` });
          setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
          return prevCart;
        }
        return prevCart.map(item => 
          (item.id === product.id && item.tipo === product.tipo)
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, cantidad: 1 }];
    });
  };

  const removeFromCart = (product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id && item.tipo === product.tipo);
      if (existing.cantidad === 1) {
        return prevCart.filter(item => !(item.id === product.id && item.tipo === product.tipo));
      }
      return prevCart.map(item => 
        (item.id === product.id && item.tipo === product.tipo)
          ? { ...item, cantidad: item.cantidad - 1 }
          : item
      );
    });
  };

  const deleteFromCart = (id, tipo) => {
    setCart(prevCart => prevCart.filter(item => !(item.id === id && item.tipo === tipo)));
  };

  // Totales
  const getCartTotal = () => {
    return cart.reduce((total, item) => total + parseFloat(item.precio) * item.cantidad, 0);
  };

  const getCambio = () => {
    const total = getCartTotal();
    const recibido = parseFloat(pagoRecibido || 0);
    return Math.max(0, recibido - total);
  };

  // Realizar Cobro
  const handleCobrar = async () => {
    if (cart.length === 0) return;
    
    const total = getCartTotal();
    const recibido = parseFloat(pagoRecibido || total);

    if (metodoPago === 'efectivo' && recibido < total) {
      setMensaje({ tipo: 'danger', texto: 'El dinero recibido es insuficiente.' });
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
      return;
    }

    setLoading(true);
    try {
      const ventaPayload = {
        total,
        pago_recibido: metodoPago === 'efectivo' ? recibido : total,
        metodo_pago: metodoPago,
        productos: cart.map(item => ({
          id: item.id,
          tipo: item.tipo,
          cantidad: item.cantidad
        }))
      };

      const res = await api.ventas.create(ventaPayload);
      if (res.success) {
        setTicketData(res.data.ticket);
        setShowTicket(true);
        setCart([]);
        setPagoRecibido('');
        // Recargar productos
        cargarProductos();
      }
    } catch (err) {
      console.error('Error al realizar checkout:', err);
      setMensaje({ tipo: 'danger', texto: err.message || 'Error al procesar la venta.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.posContainer}>
      {/* ALERTA DE MENSAJES */}
      {mensaje.texto && (
        <div 
          className={`alert alert-${mensaje.tipo}`} 
          style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, boxShadow: 'var(--shadow-lg)' }}
        >
          {mensaje.texto}
        </div>
      )}

      {/* BLOQUEO SI CAJA NO ESTÁ INICIADA */}
      {!turnoActivo && (
        <div style={styles.lockOverlay}>
          <div className="card" style={styles.lockCard}>
            <Lock size={44} color="var(--primary)" />
            <h2 style={{ marginTop: '16px' }}>Terminal POS Inhabilitado</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '12px 0 24px 0' }}>
              No hay un turno de caja activo para tu usuario. Para realizar ventas, primero debes iniciar tu turno de caja registradora.
            </p>
            <a href="/shifts" className="btn btn-primary">
              Ir a Caja Registradora
            </a>
          </div>
        </div>
      )}

      <div style={styles.mainLayout}>
        {/* COLUMNA IZQUIERDA: PRODUCTOS Y FILTROS */}
        <div style={styles.catalogoColumn}>
          {/* BARRA BUSCADOR Y FILTROS */}
          <div style={styles.filterBar}>
            <div style={styles.searchWrapper}>
              <Search size={18} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar pan dulce, bolillos, refrescos..."
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
                Todos
              </button>
              <button 
                onClick={() => setActiveCategory('pan')}
                style={{
                  ...styles.tabBtn,
                  ...(activeCategory === 'pan' ? styles.tabBtnActive : {})
                }}
              >
                Panadería
              </button>
              <button 
                onClick={() => setActiveCategory('refri')}
                style={{
                  ...styles.tabBtn,
                  ...(activeCategory === 'refri' ? styles.tabBtnActive : {})
                }}
              >
                Refrigerador
              </button>
              <button 
                onClick={() => setActiveCategory('tienda')}
                style={{
                  ...styles.tabBtn,
                  ...(activeCategory === 'tienda' ? styles.tabBtnActive : {})
                }}
              >
                Tienda / Abarrotes
              </button>
            </div>
          </div>

          {/* GRID DE PRODUCTOS */}
          <div style={styles.productsGrid}>
            {getFilteredProducts().map((product) => {
              const stock = product.tipo === 'pan' ? product.stock_actual : 99; // refri/tienda ilimitados
              const isOut = stock <= 0;
              const isLow = product.tipo === 'pan' && stock <= product.stock_minimo;
              
              return (
                <div 
                  key={`${product.tipo}-${product.id}`}
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
                    <div style={styles.productPlaceholder}>
                      <span>🍞</span>
                    </div>
                  )}
                  
                  <div style={styles.productInfo}>
                    <span style={styles.productCat}>{product.categoria_display}</span>
                    <h3 style={styles.productName}>{product.nombre}</h3>
                    <div style={styles.productBottom}>
                      <span style={styles.productPrice}>${parseFloat(product.precio).toFixed(2)}</span>
                      
                      {product.tipo === 'pan' && (
                        <span 
                          style={{
                            ...styles.productStock,
                            color: isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--text-muted)'
                          }}
                        >
                          {isOut ? 'Agotado' : `Stock: ${stock}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {getFilteredProducts().length === 0 && (
              <div style={styles.emptyCatalog}>
                <Compass size={40} color="var(--text-muted)" />
                <p>No se encontraron productos coincidentes en el catálogo.</p>
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: CARRITO Y COBRO */}
        <div style={styles.cartColumn}>
          <div style={styles.cartHeader}>
            <ShoppingCart size={20} color="var(--secondary)" />
            <h2 style={{ fontSize: '18px' }}>Carrito de Venta</h2>
            {cart.length > 0 && (
              <span className="badge badge-success" style={{ marginLeft: '8px' }}>
                {cart.reduce((sum, i) => sum + i.cantidad, 0)}
              </span>
            )}
          </div>

          {/* LISTA DEL CARRITO */}
          <div style={styles.cartList}>
            {cart.length === 0 ? (
              <div style={styles.emptyCart}>
                <span>🍞 Carrito vacío</span>
                <p>Haz clic en los panes o abarrotes de la izquierda para agregarlos a la orden.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={`${item.tipo}-${item.id}`} style={styles.cartItem}>
                  <div style={styles.cartItemDetails}>
                    <span style={styles.cartItemName}>{item.nombre}</span>
                    <span style={styles.cartItemSub}>
                      ${parseFloat(item.precio).toFixed(2)} c/u • {item.categoria_display}
                    </span>
                  </div>
                  
                  <div style={styles.cartItemActions}>
                    <button 
                      onClick={() => removeFromCart(item)}
                      style={styles.cartCountBtn}
                    >
                      <Minus size={12} />
                    </button>
                    <span style={styles.cartItemQty}>{item.cantidad}</span>
                    <button 
                      onClick={() => addToCart(item)}
                      style={styles.cartCountBtn}
                    >
                      <Plus size={12} />
                    </button>
                    
                    <span style={styles.cartItemTotal}>
                      ${(parseFloat(item.precio) * item.cantidad).toFixed(2)}
                    </span>
                    
                    <button 
                      onClick={() => deleteFromCart(item.id, item.tipo)}
                      style={styles.cartDeleteBtn}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* CAJÓN DE COBRO */}
          <div style={styles.checkoutDrawer}>
            <div style={styles.totalRow}>
              <span>Subtotal:</span>
              <span>${getCartTotal().toFixed(2)}</span>
            </div>
            <div style={{ ...styles.totalRow, fontSize: '20px', fontWeight: '800', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <span>Total a Pagar:</span>
              <span style={{ color: 'var(--primary)' }}>${getCartTotal().toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                onClick={() => setMetodoPago('efectivo')}
                style={{
                  ...styles.payMethodBtn,
                  ...(metodoPago === 'efectivo' ? styles.payMethodBtnActive : {})
                }}
              >
                <DollarSign size={16} />
                <span>Efectivo</span>
              </button>
              <button
                onClick={() => setMetodoPago('tarjeta')}
                style={{
                  ...styles.payMethodBtn,
                  ...(metodoPago === 'tarjeta' ? styles.payMethodBtnActive : {})
                }}
              >
                <CreditCard size={16} />
                <span>Tarjeta</span>
              </button>
            </div>

            {metodoPago === 'efectivo' && cart.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label">Efectivo Recibido</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Ingrese importe..."
                    value={pagoRecibido}
                    onChange={(e) => setPagoRecibido(e.target.value)}
                  />
                </div>
                {parseFloat(pagoRecibido || 0) >= getCartTotal() && (
                  <div style={styles.changeDisplay}>
                    <span>Cambio a devolver:</span>
                    <strong>${getCambio().toFixed(2)}</strong>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleCobrar}
              className="btn btn-primary"
              disabled={cart.length === 0 || loading || (metodoPago === 'efectivo' && parseFloat(pagoRecibido || 0) < getCartTotal())}
              style={{ width: '100%', marginTop: '20px', padding: '14px' }}
            >
              <Receipt size={18} />
              <span>Registrar y Cobrar Venta</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE TICKET SIMULADO */}
      {showTicket && ticketData && (
        <div style={styles.modalOverlay}>
          <div style={styles.ticketContainer}>
            <div style={styles.ticketHeader}>
              <div style={styles.ticketLogo}>🍞</div>
              <h2 className="brand-title" style={{ fontSize: '20px' }}>PanaPina</h2>
              <span style={{ fontSize: '11px', color: '#666' }}>Calle del Horno #10, Col. Centro</span>
              <span style={{ fontSize: '11px', color: '#666' }}>TEL: 555-000-0001</span>
            </div>

            <div style={styles.ticketMetadata}>
              <div>Folio: <strong>{ticketData.folio}</strong></div>
              <div>Fecha: {new Date(ticketData.fecha).toLocaleString()}</div>
            </div>

            <div style={styles.ticketSeparator}>--------------------------------</div>

            <div style={styles.ticketItems}>
              {ticketData.productos.map((item, idx) => (
                <div key={idx} style={styles.ticketItemRow}>
                  <span>
                    {item.nombre_producto} x{item.cantidad}
                  </span>
                  <span>${parseFloat(item.subtotal).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={styles.ticketSeparator}>--------------------------------</div>

            <div style={styles.ticketTotals}>
              <div style={styles.ticketTotalRow}>
                <span>TOTAL:</span>
                <strong>${parseFloat(ticketData.total).toFixed(2)}</strong>
              </div>
              <div style={styles.ticketTotalRow}>
                <span>EFECTIVO RECIBIDO:</span>
                <span>${parseFloat(ticketData.pago_recibido).toFixed(2)}</span>
              </div>
              <div style={styles.ticketTotalRow}>
                <span>CAMBIO:</span>
                <span>${parseFloat(ticketData.cambio).toFixed(2)}</span>
              </div>
            </div>

            <div style={styles.ticketFooter}>
              <p>¡Gracias por comprar en PanaPina!</p>
              <p>Pan horneado con amor hoy mismo.</p>
            </div>

            <button 
              onClick={() => {
                setShowTicket(false);
                setTicketData(null);
              }}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '24px' }}
            >
              Cerrar y Nueva Venta
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  posContainer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(250, 247, 242, 0.95)',
    zIndex: 99,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px'
  },
  lockCard: {
    maxWidth: '440px',
    textAlign: 'center',
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  mainLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: '24px',
    height: 'calc(100vh - 144px)',
    overflow: 'hidden'
  },
  catalogoColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflow: 'hidden'
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
    gap: '8px'
  },
  tabBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--card-bg)',
    color: 'var(--text-muted)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  tabBtnActive: {
    background: 'var(--primary)',
    borderColor: 'var(--primary)',
    color: '#fff'
  },
  productsGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
    gap: '16px',
    overflowY: 'auto',
    paddingRight: '4px',
    paddingBottom: '20px'
  },
  productCard: {
    padding: '12px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  productCardDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    pointerEvents: 'none'
  },
  productImg: {
    width: '100%',
    height: '110px',
    objectFit: 'cover',
    borderRadius: '10px'
  },
  productPlaceholder: {
    width: '100%',
    height: '110px',
    backgroundColor: 'var(--primary-light)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px'
  },
  productInfo: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left'
  },
  productCat: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  productName: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--secondary)',
    margin: '2px 0 6px 0',
    height: '38px',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical'
  },
  productBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  productPrice: {
    fontSize: '15px',
    fontWeight: '800',
    color: 'var(--primary)'
  },
  productStock: {
    fontSize: '10px',
    fontWeight: '600'
  },
  cartColumn: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)'
  },
  cartHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)'
  },
  cartList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  emptyCart: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    height: '100%',
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '24px'
  },
  cartItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border)'
  },
  cartItemDetails: {
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
    justifyContent: 'flex-end',
    gap: '8px'
  },
  cartCountBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--background)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-main)'
  },
  cartItemQty: {
    fontSize: '13px',
    fontWeight: '700',
    width: '20px',
    textAlign: 'center'
  },
  cartItemTotal: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--secondary)',
    marginLeft: 'auto',
    marginRight: '8px'
  },
  cartDeleteBtn: {
    border: 'none',
    background: 'none',
    color: 'var(--danger)',
    cursor: 'pointer',
    padding: '4px'
  },
  checkoutDrawer: {
    padding: '20px',
    borderTop: '1px solid var(--border)',
    backgroundColor: 'var(--background)'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--secondary)',
    marginBottom: '8px'
  },
  payMethodBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    borderRadius: '10px',
    border: '2px solid var(--border)',
    backgroundColor: 'var(--card-bg)',
    color: 'var(--text-muted)',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  payMethodBtnActive: {
    borderColor: 'var(--primary)',
    color: 'var(--primary)',
    backgroundColor: 'var(--primary-light)'
  },
  changeDisplay: {
    marginTop: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: 'var(--success-bg)',
    borderRadius: '8px',
    color: 'var(--success)',
    fontSize: '13px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000
  },
  ticketContainer: {
    width: '320px',
    backgroundColor: '#fff',
    color: '#000',
    fontFamily: 'monospace',
    padding: '24px',
    borderRadius: '6px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column'
  },
  ticketHeader: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '16px'
  },
  ticketLogo: {
    fontSize: '32px',
    marginBottom: '4px'
  },
  ticketMetadata: {
    fontSize: '11px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  ticketSeparator: {
    textAlign: 'center',
    margin: '10px 0',
    userSelect: 'none'
  },
  ticketItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '12px'
  },
  ticketItemRow: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  ticketTotals: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '12px',
    textAlign: 'left'
  },
  ticketTotalRow: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  ticketFooter: {
    marginTop: '20px',
    textAlign: 'center',
    fontSize: '11px',
    color: '#444'
  },
  emptyCatalog: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '60px 24px',
    color: 'var(--text-muted)',
    fontSize: '14px',
    textAlign: 'center'
  }
};
