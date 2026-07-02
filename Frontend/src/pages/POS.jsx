import React, { useState, useEffect, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
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

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

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
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' o 'cart'
  
  // Carrito de compras
  const [cart, setCart] = useState([]);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [pagoRecibido, setPagoRecibido] = useState('');
  
  // Modal de Ticket / Compra completada
  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState(null);

  // Modal de tarjeta
  const [showCardModal, setShowCardModal] = useState(false);

  // Estados de Facturación
  const [currentVentaId, setCurrentVentaId] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showInvoiceSuccess, setShowInvoiceSuccess] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  const [invoiceData, setInvoiceData] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({
    rfc: '',
    nombre: '',
    codigo_postal: '',
    regimen_fiscal: '601',
    uso_cfdi: 'G03',
    email: ''
  });

  // Estados generales
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardError, setCardError] = useState('');
  const [cardReady, setCardReady] = useState(false);
  const cardElementRef = useRef(null);
  const stripeCardRef = useRef(null);
  const stripeElementsRef = useRef(null);

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    const styleId = 'pos-custom-styles';
    if (!document.getElementById(styleId)) {
      const sheet = document.createElement('style');
      sheet.id = styleId;
      sheet.innerHTML = `
        .pos-product-card {
          background-color: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.02);
          transition: all 0.2s ease-in-out;
        }
        .pos-product-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(180, 83, 9, 0.1);
          border-color: var(--primary);
        }
        .pos-cart-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background-color: var(--card-bg);
          border-radius: 10px;
          border: 1px solid var(--border);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
          transition: all 0.15s ease-in-out;
        }
        .pos-cart-item:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          border-color: var(--primary-light);
        }
      `;
      document.head.appendChild(sheet);
    }
  }, []);

  useEffect(() => {
    const mountCardElement = async () => {
      if (!cardElementRef.current || stripeCardRef.current) return;

      const stripe = await stripePromise;
      if (!stripe) {
        setCardError('No se pudo cargar Stripe.');
        return;
      }

      const elements = stripe.elements();
      stripeElementsRef.current = elements;

      const card = elements.create('card', {
        hidePostalCode: true,
        style: {
          base: {
            color: '#111827',
            fontSize: '16px',
            '::placeholder': { color: '#9ca3af' }
          },
          invalid: {
            color: '#dc2626'
          }
        }
      });

      card.mount(cardElementRef.current);
      card.on('change', (event) => {
        setCardError(event.error ? event.error.message : '');
        setCardReady(event.complete);
      });

      stripeCardRef.current = card;
    };

    mountCardElement();
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
      if (metodoPago === 'tarjeta') {
        // Si estamos en modo offline/simulado, saltarnos la llamada real a Stripe
        if (window.isPanapinaOffline) {
          console.log('[POS Offline] Simulando confirmación de pago con tarjeta...');
          await new Promise(r => setTimeout(r, 1000));
        } else {
          if (!cardReady || !stripeCardRef.current) {
            throw new Error('Por favor completa los datos de la tarjeta antes de pagar.');
          }

          const stripe = await stripePromise;
          if (!stripe) {
            throw new Error('No se pudo inicializar Stripe.');
          }

          const stripeResponse = await api.stripe.pay({ amount: total, currency: 'mxn' });
          if (!stripeResponse.success || !stripeResponse.client_secret) {
            throw new Error(stripeResponse.message || 'No se pudo procesar el pago con tarjeta.');
          }

          const result = await stripe.confirmCardPayment(stripeResponse.client_secret, {
            payment_method: {
              card: stripeCardRef.current,
              billing_details: {
                name: cardHolderName || 'Cliente PanaPina'
              }
            }
          });

          if (result.error) {
            throw new Error(result.error.message || 'Error al confirmar pago con Stripe.');
          }

          if (result.paymentIntent?.status !== 'succeeded') {
            throw new Error('El pago no se completó correctamente.');
          }
        }
      }

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
        setCurrentVentaId(res.data?.venta?.id || Math.floor(Math.random() * 1000) + 1);
        setTicketData(res.data.ticket);
        setShowTicket(true);
        setCart([]);
        setPagoRecibido('');
        // Recargar productos
        cargarProductos();
        setShowCardModal(false);
        setActiveTab('catalog');
      }
    } catch (err) {
      console.error('Error al realizar checkout:', err);
      setMensaje({ tipo: 'danger', texto: err.message || 'Error al procesar la venta.' });
    } finally {
      setLoading(false);
    }
  };

  // Generar Factura CFDI 4.0
  const handleGenerarFactura = async (e) => {
    if (e) e.preventDefault();
    if (!invoiceForm.rfc || !invoiceForm.nombre || !invoiceForm.codigo_postal) {
      setInvoiceError('Por favor, completa todos los campos requeridos.');
      return;
    }

    const rfcRegex = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/i;
    if (!rfcRegex.test(invoiceForm.rfc)) {
      setInvoiceError('El formato de RFC no es válido.');
      return;
    }

    if (invoiceForm.codigo_postal.length !== 5) {
      setInvoiceError('El código postal debe ser de 5 dígitos.');
      return;
    }

    setInvoiceLoading(true);
    setInvoiceError('');

    try {
      const res = await api.ventas.facturar(currentVentaId, invoiceForm);
      if (res.success) {
        setInvoiceData(res.data);
        setShowInvoiceModal(false);
        setShowInvoiceSuccess(true);
      } else {
        throw new Error(res.message || 'Error al generar la factura.');
      }
    } catch (err) {
      console.error('Error al facturar:', err);
      setInvoiceError(err.message || 'Ocurrió un error al procesar la factura con Facturama.');
    } finally {
      setInvoiceLoading(false);
    }
  };

  // Función para descargar archivos base64 en el cliente
  const descargarArchivoFactura = (base64Data, fileName, contentType) => {
    const linkSource = `data:${contentType};base64,${base64Data}`;
    const downloadLink = document.createElement("a");
    downloadLink.href = linkSource;
    downloadLink.download = fileName;
    downloadLink.click();
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
        {activeTab === 'catalog' ? (
          /* COLUMNA IZQUIERDA COMPLETA EN 100% ANCHO */
          <div style={{ ...styles.catalogoColumn, width: '100%', flex: 1 }}>
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

              {/* Botón flotante para ver Carrito */}
              <button 
                onClick={() => setActiveTab('cart')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  backgroundColor: cart.length > 0 ? 'var(--primary)' : '#9ca3af',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: cart.length > 0 ? '0 4px 14px rgba(180, 83, 9, 0.35)' : 'none',
                  transition: 'all 0.2s ease',
                  marginLeft: '12px',
                  height: '42px',
                  alignSelf: 'center',
                  flexShrink: 0
                }}
              >
                <ShoppingCart size={18} />
                <span>Ver Carrito</span>
                <span style={{
                  backgroundColor: '#fff',
                  color: cart.length > 0 ? 'var(--primary)' : '#6b7280',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '800',
                  marginLeft: '4px'
                }}>
                  {cart.reduce((sum, i) => sum + i.cantidad, 0)}
                </span>
              </button>
            </div>

            {/* GRID DE PRODUCTOS */}
            <div style={styles.productsGrid}>
              {getFilteredProducts().map((product) => {
                const stock = product.tipo === 'pan' ? product.stock_actual : 99; // refri/tienda ilimitados
                const isOut = stock <= 0;
                const isLow = product.tipo === 'pan' && stock <= product.stock_minimo;
                
                // Estilo de badge del stock
                const getStockBadgeStyle = () => {
                  if (isOut) {
                    return {
                      padding: '3px 8px',
                      borderRadius: '20px',
                      backgroundColor: '#fee2e2',
                      color: '#ef4444',
                      fontSize: '10px',
                      fontWeight: '700'
                    };
                  }
                  if (isLow) {
                    return {
                      padding: '3px 8px',
                      borderRadius: '20px',
                      backgroundColor: '#fef3c7',
                      color: '#d97706',
                      fontSize: '10px',
                      fontWeight: '700'
                    };
                  }
                  return {
                    padding: '3px 8px',
                    borderRadius: '20px',
                    backgroundColor: '#f3f4f6',
                    color: '#4b5563',
                    fontSize: '10px',
                    fontWeight: '750'
                  };
                };

                return (
                  <div 
                    key={`${product.tipo}-${product.id}`}
                    onClick={() => {
                      if (!isOut) {
                        addToCart(product);
                      }
                    }}
                    className="pos-product-card"
                    style={isOut ? styles.productCardDisabled : {}}
                  >
                    {product.imagen_url ? (
                      <img src={product.imagen_url} alt={product.nombre} style={styles.productImg} />
                    ) : (
                      <div style={styles.productPlaceholder}>
                        <span style={{ fontSize: '28px' }}>{product.tipo === 'pan' ? '🍞' : product.tipo === 'refri' ? '🥤' : '📦'}</span>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: '#b45309', opacity: 0.8, textTransform: 'uppercase' }}>Sin imagen</span>
                      </div>
                    )}
                    
                    <div style={styles.productInfo}>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '800',
                        color: product.tipo === 'pan' ? '#b45309' : product.tipo === 'refri' ? '#0891b2' : '#059669',
                        backgroundColor: product.tipo === 'pan' ? '#fef3c7' : product.tipo === 'refri' ? '#ecfeff' : '#e6f4ea',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        alignSelf: 'flex-start',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '4px'
                      }}>
                        {product.categoria_display}
                      </span>
                      <h3 style={styles.productName}>{product.nombre}</h3>
                      <div style={styles.productBottom}>
                        <span style={styles.productPrice}>${parseFloat(product.precio).toFixed(2)}</span>
                        
                        {product.tipo === 'pan' && (
                          <span style={getStockBadgeStyle()}>
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
        ) : (
          /* PANTALLA EXCLUSIVA DEL CARRITO Y COBRO (Doble columna espaciosa) */
          <div style={{ display: 'flex', width: '100%', gap: '24px', animation: 'floatUp 0.3s ease', flex: 1, overflow: 'hidden', height: '100%' }}>
            {/* Columna Izquierda: Detalle de productos en el carrito */}
            <div style={{ flex: 1.4, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', padding: '24px', boxShadow: 'var(--shadow-sm)', height: '100%', overflow: 'hidden' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                <button 
                  onClick={() => setActiveTab('catalog')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  ← Volver al Catálogo
                </button>
                <h2 style={{ fontSize: '20px', color: 'var(--secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingCart size={22} color="var(--primary)" />
                  Detalle del Carrito
                </h2>
              </div>

              {/* Lista de productos en el carrito */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                {cart.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', height: '100%', minHeight: '200px', color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '36px' }}>🍞</span>
                    <p style={{ margin: 0, fontWeight: '600' }}>El carrito está vacío</p>
                    <button onClick={() => setActiveTab('catalog')} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>Ir al Catálogo</button>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div 
                      key={`${item.tipo}-${item.id}`} 
                      className="pos-cart-item" 
                      style={{ 
                        borderLeft: item.tipo === 'pan' ? '4px solid var(--primary)' : item.tipo === 'refri' ? '4px solid #0891b2' : '4px solid #059669',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        padding: '12px'
                      }}
                    >
                      {/* Fila 1: Imagen, Nombre y Eliminar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--background)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          border: '1px solid var(--border)',
                          flexShrink: 0
                        }}>
                          {item.imagen_url ? (
                            <img src={item.imagen_url} alt={item.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '14px' }}>{item.tipo === 'pan' ? '🍞' : item.tipo === 'refri' ? '🥤' : '📦'}</span>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '700',
                            color: 'var(--secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textAlign: 'left'
                          }} title={item.nombre}>
                            {item.nombre}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            fontWeight: '500',
                            textAlign: 'left'
                          }}>
                            {item.categoria_display}
                          </span>
                        </div>

                        <button 
                          onClick={() => deleteFromCart(item.id, item.tipo)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.8,
                            transition: 'opacity 0.1s ease'
                          }}
                          type="button"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Fila 2: Precio unitario, Controles de cantidad y Subtotal */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        width: '100%', 
                        borderTop: '1px dashed var(--border)', 
                        paddingTop: '8px', 
                        marginTop: '2px' 
                      }}>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: 'var(--text-muted)'
                        }}>
                          ${parseFloat(item.precio).toFixed(2)} c/u
                        </span>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          backgroundColor: 'var(--background)',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)'
                        }}>
                          <button 
                            onClick={() => removeFromCart(item)}
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: 'var(--card-bg)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: 'var(--text-main)',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}
                            type="button"
                          >
                            <Minus size={10} />
                          </button>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: '700',
                            minWidth: '14px',
                            textAlign: 'center',
                            color: 'var(--secondary)'
                          }}>{item.cantidad}</span>
                          <button 
                            onClick={() => addToCart(item)}
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: 'var(--card-bg)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: 'var(--text-main)',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}
                            type="button"
                          >
                            <Plus size={10} />
                          </button>
                        </div>

                        <span style={{
                          fontSize: '14px',
                          fontWeight: '800',
                          color: 'var(--primary)',
                          textAlign: 'right'
                        }}>
                          ${(parseFloat(item.precio) * item.cantidad).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Columna Derecha: Cobro */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', padding: '24px', boxShadow: 'var(--shadow-sm)', height: '100%', overflowY: 'auto' }}>
              <h2 style={{ fontSize: '18px', color: 'var(--secondary)', margin: '0 0 20px 0', borderBottom: '1px solid var(--border)', paddingBottom: '16px', textAlign: 'left' }}>Resumen del Cobro</h2>
              
              <div style={styles.totalRow}>
                <span>Subtotal:</span>
                <span>${getCartTotal().toFixed(2)}</span>
              </div>
              <div style={{ ...styles.totalRow, fontSize: '22px', fontWeight: '800', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
                <span>Total a Pagar:</span>
                <span style={{ color: 'var(--primary)' }}>${getCartTotal().toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
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
                  onClick={() => {
                    setMetodoPago('tarjeta');
                    setShowCardModal(true);
                  }}
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
                <div style={{ marginTop: '16px', textAlign: 'left' }}>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Efectivo Recibido</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Ingrese importe..."
                      value={pagoRecibido}
                      onChange={(e) => setPagoRecibido(e.target.value)}
                      style={{ padding: '12px 14px' }}
                    />
                  </div>
                  {parseFloat(pagoRecibido || 0) >= getCartTotal() && (
                    <div style={styles.changeDisplay}>
                      <span>Cambio a devolver:</span>
                      <strong style={{ fontSize: '15px' }}>${getCambio().toFixed(2)}</strong>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => {
                  if (metodoPago === 'tarjeta') {
                    setShowCardModal(true);
                  } else {
                    handleCobrar();
                  }
                }}
                className="btn btn-primary"
                disabled={cart.length === 0 || loading || (metodoPago === 'efectivo' && parseFloat(pagoRecibido || 0) < getCartTotal())}
                style={{ width: '100%', marginTop: '28px', padding: '14px', fontSize: '15px', fontWeight: '750' }}
              >
                <Receipt size={18} />
                <span>{metodoPago === 'tarjeta' ? 'Proceder al Pago con Tarjeta' : 'Registrar y Cobrar Venta'}</span>
              </button>
            </div>
          </div>
        )}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '24px' }}>
              <button 
                onClick={() => {
                  setShowTicket(false);
                  setShowInvoiceModal(true);
                }}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                📝 Generar Factura CFDI 4.0
              </button>
              
              <button 
                onClick={() => {
                  setShowTicket(false);
                  setTicketData(null);
                }}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '12px' }}
              >
                Cerrar y Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE TARJETA STRIPE (Siempre en el DOM pero oculto vía display para conservar el mounting de Stripe) */}
      <div style={{ ...styles.modalOverlay, display: showCardModal ? 'flex' : 'none' }}>
        <div style={styles.cardModalContainer}>
          <div style={styles.cardModalHeader}>
            <CreditCard size={28} color="var(--primary)" />
            <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--secondary)' }}>Pago con Tarjeta (Stripe)</h2>
          </div>
          
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', marginTop: '8px', textAlign: 'left' }}>
            Monto total a cobrar: <strong style={{ color: 'var(--primary)', fontSize: '16px' }}>${getCartTotal().toFixed(2)} MXN</strong>
          </p>

          <div className="form-group" style={{ marginBottom: '16px', textAlign: 'left' }}>
            <label className="form-label">Nombre del Titular</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej. Juan Pérez"
              value={cardHolderName}
              onChange={(e) => setCardHolderName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '16px', textAlign: 'left' }}>
            <label className="form-label">Datos de la Tarjeta</label>
            <div
              ref={cardElementRef}
              style={{
                padding: '14px 12px',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                backgroundColor: '#fff'
              }}
            ></div>
          </div>

          {cardError && (
            <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px', textAlign: 'left', fontWeight: '600' }}>
              ⚠️ {cardError}
            </div>
          )}

          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '16px', backgroundColor: 'var(--background)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'left', lineHeight: '1.4' }}>
            💳 **Tarjeta de pruebas (Stripe):** <br />
            Número: <strong style={{ color: 'var(--secondary)' }}>4242 4242 4242 4242</strong> <br />
            Fecha: **Cualquiera en el futuro** | CVC: **123**
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowCardModal(false);
                setMetodoPago('efectivo');
              }}
              style={{ flex: 1, padding: '12px' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCobrar}
              disabled={loading || !cardReady}
              style={{ flex: 1, padding: '12px' }}
            >
              {loading ? 'Procesando...' : 'Confirmar y Pagar'}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE FORMULARIO DE FACTURACIÓN (CFDI 4.0) */}
      {showInvoiceModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.cardModalContainer, width: '480px' }}>
            <div style={styles.cardModalHeader}>
              <Receipt size={28} color="var(--primary)" />
              <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--secondary)' }}>Datos de Facturación CFDI 4.0</h2>
            </div>

            <form onSubmit={handleGenerarFactura} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
              
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">RFC del Receptor *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. EKU9003173C9"
                  value={invoiceForm.rfc}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, rfc: e.target.value.toUpperCase() }))}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Nombre o Razón Social *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. ESCUELA KEMPER URGATE"
                  value={invoiceForm.nombre}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, nombre: e.target.value.toUpperCase() }))}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1, textAlign: 'left' }}>
                  <label className="form-label">Código Postal *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. 01030"
                    maxLength={5}
                    value={invoiceForm.codigo_postal}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, codigo_postal: e.target.value.replace(/\D/g, '') }))}
                    required
                  />
                </div>
                
                <div className="form-group" style={{ flex: 2, textAlign: 'left' }}>
                  <label className="form-label">Uso de CFDI *</label>
                  <select
                    className="form-input"
                    value={invoiceForm.uso_cfdi}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, uso_cfdi: e.target.value }))}
                    style={{ padding: '10px' }}
                  >
                    <option value="G01">G01 - Adquisición de mercancías</option>
                    <option value="G03">G03 - Gastos en general</option>
                    <option value="S01">S01 - Sin efectos fiscales</option>
                    <option value="CP01">CP01 - Pagos</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Régimen Fiscal *</label>
                <select
                  className="form-input"
                  value={invoiceForm.regimen_fiscal}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, regimen_fiscal: e.target.value }))}
                  style={{ padding: '10px' }}
                >
                  <option value="601">601 - General de Ley Personas Morales</option>
                  <option value="605">605 - Sueldos y Salarios e Ingresos Asimilados</option>
                  <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                  <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                </select>
              </div>



              {invoiceError && (
                <div style={{ color: '#dc2626', fontSize: '12px', textAlign: 'left', fontWeight: '600' }}>
                  ⚠️ {invoiceError}
                </div>
              )}

              {/* Botón de Auto-completar Credenciales de Prueba */}
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '8px', borderStyle: 'dashed', borderColor: 'var(--primary)' }}
                onClick={() => {
                  setInvoiceForm({
                    rfc: 'EKU9003173C9',
                    nombre: 'ESCUELA KEMPER URGATE',
                    codigo_postal: '01030',
                    regimen_fiscal: '601',
                    uso_cfdi: 'G03',
                    email: invoiceForm.email || 'cliente_prueba@gmail.com'
                  });
                }}
              >
                ⚡ Auto-completar RFC de Prueba Facturama
              </button>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowInvoiceModal(false);
                    setInvoiceForm({ rfc: '', nombre: '', codigo_postal: '', regimen_fiscal: '601', uso_cfdi: 'G03', email: '' });
                  }}
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={invoiceLoading}
                  style={{ flex: 1 }}
                >
                  {invoiceLoading ? 'Timbrando...' : 'Generar Factura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ÉXITO DE FACTURACIÓN (Descargas XML/PDF y envío de correo) */}
      {showInvoiceSuccess && invoiceData && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.cardModalContainer, width: '440px', textAlign: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--success-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--success)',
                fontSize: '24px'
              }}>
                ✓
              </div>
              <h2 style={{ fontSize: '20px', margin: 0, color: 'var(--secondary)' }}>Factura Timbrada con Éxito</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                El comprobante fiscal CFDI 4.0 ha sido certificado ante el SAT.
              </p>
            </div>

            <div style={{
              backgroundColor: 'var(--background)',
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              textAlign: 'left',
              fontSize: '13px',
              marginBottom: '24px'
            }}>
              <div style={{ marginBottom: '6px' }}>
                RFC Receptor: <strong style={{ color: 'var(--secondary)' }}>{invoiceForm.rfc}</strong>
              </div>
              <div style={{ marginBottom: '6px' }}>
                Razón Social: <strong style={{ color: 'var(--secondary)' }}>{invoiceForm.nombre}</strong>
              </div>
              <div style={{ borderTop: '1px dashed var(--border)', margin: '8px 0', paddingTop: '8px' }}>
                UUID Fiscal: <br />
                <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--primary)' }}>
                  {invoiceData.uuid}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => descargarArchivoFactura(invoiceData.pdf_base64, `factura_${invoiceForm.rfc}.pdf`, 'application/pdf')}
                style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                📥 Descargar Factura (PDF)
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const blob = new Blob([invoiceData.xml_data], { type: "text/xml" });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `factura_${invoiceForm.rfc}.xml`;
                  a.click();
                }}
                style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                📄 Descargar Archivo XML
              </button>

              <button
                type="button"
                className="btn"
                onClick={() => {
                  const msg = `¡Hola! Te compartimos tu Factura CFDI 4.0 de Panadería PanaPina. 🍞\n\nReceptor: ${invoiceForm.nombre}\nRFC: ${invoiceForm.rfc}\nUUID Fiscal: ${invoiceData.uuid}\n\n¡Gracias por tu preferencia!`;
                  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
                  window.open(whatsappUrl, '_blank');
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#25D366',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
                  marginTop: '4px'
                }}
              >
                💬 Compartir por WhatsApp
              </button>
            </div>



            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowInvoiceSuccess(false);
                setInvoiceData(null);
                setInvoiceForm({ rfc: '', nombre: '', codigo_postal: '', regimen_fiscal: '601', uso_cfdi: 'G03', email: '' });
                setTicketData(null);
              }}
              style={{ width: '100%', padding: '12px' }}
            >
              Cerrar y Regresar al Catálogo
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
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 144px)',
    overflow: 'hidden',
    width: '100%'
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
    background: 'linear-gradient(135deg, #fdf6e2 0%, #f7ebd0 100%)',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    border: '1px dashed #e6c89c',
    fontSize: '28px'
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
  cartItemThumb: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'var(--background)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '1px solid var(--border)',
    flexShrink: 0
  },
  cartItemImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  cartItemInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
    minWidth: 0
  },
  cartItemNameText: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--secondary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  cartItemMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '2px'
  },
  cartItemUnitPrice: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--primary)'
  },
  cartItemDivider: {
    fontSize: '10px',
    color: 'var(--text-muted)'
  },
  cartItemCategory: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontWeight: '500'
  },
  cartItemQtyControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--background)',
    padding: '3px',
    borderRadius: '8px',
    border: '1px solid var(--border)'
  },
  cartQtyBtn: {
    width: '20px',
    height: '20px',
    borderRadius: '5px',
    border: 'none',
    backgroundColor: 'var(--card-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-main)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    transition: 'all 0.1s ease'
  },
  cartQtyVal: {
    fontSize: '12px',
    fontWeight: '700',
    minWidth: '16px',
    textAlign: 'center',
    color: 'var(--secondary)'
  },
  cartItemRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: '4px'
  },
  cartItemSubtotal: {
    fontSize: '13px',
    fontWeight: '800',
    color: 'var(--secondary)',
    minWidth: '55px',
    textAlign: 'right'
  },
  cartItemDelete: {
    border: 'none',
    background: 'none',
    color: 'var(--danger)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
    transition: 'opacity 0.1s ease'
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
    color: '#fff',
    backgroundColor: 'var(--primary)',
    boxShadow: '0 4px 12px rgba(180, 83, 9, 0.25)'
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
  },
  cartItemRowTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%'
  },
  cartItemRowBottom: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderTop: '1px dashed var(--border)',
    paddingTop: '8px',
    marginTop: '2px'
  },
  cardModalContainer: {
    width: '400px',
    maxHeight: 'calc(100vh - 40px)',
    overflowY: 'auto',
    backgroundColor: 'var(--card-bg)',
    borderRadius: '16px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-lg)',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  cardModalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '14px',
    marginBottom: '16px'
  }
};
