import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  ShoppingBag, 
  Search, 
  Check, 
  X, 
  Clock, 
  Calendar,
  Phone,
  User,
  Filter,
  DollarSign,
  AlertCircle
} from 'lucide-react';

export const Orders = () => {
  const [pedidos, setPedidos] = useState([]);
  const [filterEstado, setFilterEstado] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  
  // Detalle del pedido seleccionado
  const [selectedPedido, setSelectedPedido] = useState(null);

  useEffect(() => {
    cargarPedidos();
  }, [filterEstado]);

  const cargarPedidos = async () => {
    setLoading(true);
    try {
      const res = await api.pedidos.getAll(filterEstado === 'todos' ? null : filterEstado);
      if (res.success) {
        setPedidos(res.data);
      }
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
      setMensaje({ tipo: 'danger', texto: 'No se pudieron cargar los pedidos en línea.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEstado = async (id, nuevoEstado) => {
    try {
      const res = await api.pedidos.updateEstado(id, nuevoEstado);
      if (res.success) {
        setMensaje({ tipo: 'success', texto: `El estado del pedido se actualizó a: ${nuevoEstado}.` });
        setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
        cargarPedidos();
        if (selectedPedido && selectedPedido.id === id) {
          setSelectedPedido(prev => ({ ...prev, estado: nuevoEstado }));
        }
      }
    } catch (err) {
      console.error('Error al actualizar pedido:', err);
      setMensaje({ tipo: 'danger', texto: 'No se pudo actualizar el estado del pedido.' });
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    }
  };

  const getFilteredPedidos = () => {
    if (!searchQuery.trim()) return pedidos;
    const q = searchQuery.toLowerCase();
    return pedidos.filter(p => 
      p.cliente.toLowerCase().includes(q) || 
      p.telefono.includes(q) || 
      p.orden.toLowerCase().includes(q)
    );
  };

  // Métricas
  const getMetrics = () => {
    const total = pedidos.length;
    const pendientes = pedidos.filter(p => p.estado === 'pendiente').length;
    const completados = pedidos.filter(p => p.estado === 'completado').length;
    const cancelados = pedidos.filter(p => p.estado === 'cancelado').length;
    return { total, pendientes, completados, cancelados };
  };

  const metrics = getMetrics();

  return (
    <div style={styles.container}>
      {/* MENSAJES */}
      {mensaje.texto && (
        <div className={`alert alert-${mensaje.tipo}`} style={styles.alert}>
          {mensaje.texto}
        </div>
      )}

      {/* METRICAS DE PEDIDOS */}
      <div style={styles.metricsGrid}>
        <div className="card" style={styles.metricCard}>
          <span style={styles.metricTitle}>Total Pedidos</span>
          <strong style={styles.metricVal}>{metrics.total}</strong>
        </div>
        <div className="card" style={{ ...styles.metricCard, borderLeft: '4px solid var(--warning)' }}>
          <span style={styles.metricTitle}>🕒 Pendientes</span>
          <strong style={{ ...styles.metricVal, color: 'var(--warning)' }}>{metrics.pendientes}</strong>
        </div>
        <div className="card" style={{ ...styles.metricCard, borderLeft: '4px solid var(--success)' }}>
          <span style={styles.metricTitle}>✅ Completados</span>
          <strong style={{ ...styles.metricVal, color: 'var(--success)' }}>{metrics.completados}</strong>
        </div>
        <div className="card" style={{ ...styles.metricCard, borderLeft: '4px solid var(--danger)' }}>
          <span style={styles.metricTitle}>❌ Cancelados</span>
          <strong style={{ ...styles.metricVal, color: 'var(--danger)' }}>{metrics.cancelados}</strong>
        </div>
      </div>

      {/* CONTENIDO CENTRAL */}
      <div style={styles.mainLayout}>
        {/* COLUMNA IZQUIERDA: LISTADO */}
        <div className="card" style={styles.listCard}>
          <div style={styles.listHeader}>
            <div style={styles.searchWrapper}>
              <Search size={16} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar por cliente, teléfono u orden..."
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
            </div>
            
            <div style={styles.filterWrapper}>
              <Filter size={14} color="var(--text-muted)" />
              <select
                className="form-input form-select"
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '12px', minWidth: '130px' }}
              >
                <option value="todos">Todos los Estados</option>
                <option value="pendiente">🕒 Pendientes</option>
                <option value="completado">✅ Completados</option>
                <option value="cancelado">❌ Cancelados</option>
              </select>
            </div>
          </div>

          <div style={styles.ordersList}>
            {loading ? (
              <div style={styles.emptyState}>Cargando pedidos...</div>
            ) : getFilteredPedidos().length === 0 ? (
              <div style={styles.emptyState}>No se encontraron pedidos.</div>
            ) : (
              getFilteredPedidos().map(pedido => (
                <div 
                  key={pedido.id}
                  onClick={() => setSelectedPedido(pedido)}
                  style={{
                    ...styles.orderItem,
                    ...(selectedPedido?.id === pedido.id ? styles.orderItemActive : {})
                  }}
                >
                  <div style={styles.orderItemHeader}>
                    <strong style={{ color: 'var(--primary)' }}>{pedido.orden}</strong>
                    <span 
                      className={`badge ${
                        pedido.estado === 'pendiente' ? 'badge-warning' : 
                        pedido.estado === 'completado' ? 'badge-success' : 'badge-danger'
                      }`}
                      style={{ fontSize: '10px', padding: '4px 8px' }}
                    >
                      {pedido.estado}
                    </span>
                  </div>
                  <div style={styles.orderItemBody}>
                    <span style={styles.clientName}>{pedido.cliente}</span>
                    <span style={styles.pickupTime}>🕒 {pedido.hora_recogida} hrs</span>
                  </div>
                  <div style={styles.orderItemFooter}>
                    <span>{pedido.productos.reduce((sum, p) => sum + p.cantidad, 0)} panes</span>
                    <strong>${pedido.total.toFixed(2)}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: GESTIÓN Y DETALLE */}
        <div className="card" style={styles.detailCard}>
          {selectedPedido ? (
            <div style={styles.detailContent}>
              <div style={styles.detailHeader}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--secondary)' }}>
                    Pedido {selectedPedido.orden}
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Recibido: {new Date(selectedPedido.creado_en).toLocaleString('es-MX')}
                  </span>
                </div>
                
                {selectedPedido.estado === 'pendiente' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handleUpdateEstado(selectedPedido.id, 'cancelado')}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                      title="Cancelar Reserva"
                    >
                      <X size={14} style={{ marginRight: '4px' }} />
                      Cancelar
                    </button>
                    <button 
                      onClick={() => handleUpdateEstado(selectedPedido.id, 'completado')}
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      title="Marcar como entregado y cobrado"
                    >
                      <Check size={14} style={{ marginRight: '4px' }} />
                      Marcar Entregado
                    </button>
                  </div>
                )}
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />

              {/* DATOS DEL CLIENTE */}
              <div style={styles.infoSection}>
                <h4 style={styles.sectionTitle}>Datos del Cliente</h4>
                <div style={styles.infoRow}>
                  <User size={16} color="var(--text-muted)" />
                  <span><strong>Nombre:</strong> {selectedPedido.cliente}</span>
                </div>
                <div style={styles.infoRow}>
                  <Phone size={16} color="var(--text-muted)" />
                  <span><strong>Teléfono:</strong> {selectedPedido.telefono}</span>
                </div>
                <div style={styles.infoRow}>
                  <Clock size={16} color="var(--text-muted)" />
                  <span><strong>Hora de Entrega:</strong> {selectedPedido.hora_recogida} hrs</span>
                </div>
                {selectedPedido.notas && (
                  <div style={{ ...styles.infoRow, alignItems: 'flex-start' }}>
                    <AlertCircle size={16} color="var(--primary)" style={{ marginTop: '2px' }} />
                    <span style={{ color: 'var(--primary)', fontStyle: 'italic' }}>
                      <strong>Notas del cliente:</strong> "{selectedPedido.notas}"
                    </span>
                  </div>
                )}
              </div>

              {/* PRODUCTOS RESERVADOS */}
              <div style={styles.productsSection}>
                <h4 style={styles.sectionTitle}>Productos del Pedido</h4>
                <div style={styles.productsList}>
                  {selectedPedido.productos.map((item, idx) => (
                    <div key={idx} style={styles.productRow}>
                      <div>
                        <strong>{item.nombre || item.nombre_producto}</strong>
                        <span style={styles.productQty}>x{item.cantidad}</span>
                      </div>
                      <span>${(parseFloat(item.precio || item.precio_unitario) * item.cantidad).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div style={styles.totalBlock}>
                  <div style={styles.totalRow}>
                    <span>Total de Panes:</span>
                    <span>{selectedPedido.productos.reduce((sum, p) => sum + p.cantidad, 0)} piezas</span>
                  </div>
                  <div style={{ ...styles.totalRow, fontSize: '18px', fontWeight: '800', marginTop: '8px', color: 'var(--secondary)' }}>
                    <span>Total a Cobrar:</span>
                    <span>${selectedPedido.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {selectedPedido.estado === 'completado' && (
                <div style={styles.completedBanner}>
                  <Check size={18} color="var(--success)" />
                  <span>Este pedido ya fue cobrado y entregado en mostrador.</span>
                </div>
              )}
              {selectedPedido.estado === 'cancelado' && (
                <div style={{ ...styles.completedBanner, backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                  <X size={18} color="var(--danger)" />
                  <span>Este pedido fue cancelado.</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ ...styles.emptyState, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
              <p>Selecciona un pedido del panel izquierdo para ver sus detalles y gestionarlo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    height: 'calc(100vh - 80px)',
    boxSizing: 'border-box'
  },
  alert: {
    margin: 0
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px'
  },
  metricCard: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    textAlign: 'left'
  },
  metricTitle: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  metricVal: {
    fontSize: '24px',
    fontWeight: '800',
    color: 'var(--secondary)',
    marginTop: '4px'
  },
  mainLayout: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '360px 1fr',
    gap: '24px',
    minHeight: 0 // Importante para que el scroll del flexbox funcione
  },
  listCard: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: 0
  },
  listHeader: {
    padding: '16px',
    borderBottom: '1px solid var(--border)',
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
    left: '12px',
    color: 'var(--text-muted)'
  },
  filterWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'flex-end'
  },
  ordersList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column'
  },
  orderItem: {
    padding: '16px',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: 'var(--background)'
    }
  },
  orderItemActive: {
    backgroundColor: 'var(--primary-light)',
    borderLeft: '4px solid var(--primary)',
    paddingLeft: '12px'
  },
  orderItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px'
  },
  orderItemBody: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  clientName: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--secondary)'
  },
  pickupTime: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: '600'
  },
  orderItemFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: 'var(--text-muted)'
  },
  emptyState: {
    padding: '48px 16px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    fontSize: '14px'
  },
  detailCard: {
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    padding: '24px'
  },
  detailContent: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
    height: '100%'
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px'
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px'
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px'
  },
  productsSection: {
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '16px',
    backgroundColor: 'var(--background)',
    marginBottom: '20px'
  },
  productsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '16px'
  },
  productRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    alignItems: 'center'
  },
  productQty: {
    marginLeft: '8px',
    color: 'var(--primary)',
    fontWeight: '700'
  },
  totalBlock: {
    borderTop: '1px dashed var(--border)',
    paddingTop: '12px'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: 'var(--text-muted)'
  },
  completedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: 'var(--success-bg)',
    color: 'var(--success)',
    border: '1px solid var(--success)',
    fontSize: '13px',
    fontWeight: '600',
    marginTop: 'auto'
  }
};
