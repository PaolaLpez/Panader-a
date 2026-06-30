import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Plus, 
  Edit2, 
  Eye, 
  EyeOff, 
  TrendingDown, 
  Layers,
  Sparkles,
  Search,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export const Inventory = () => {
  const { isAdmin } = useAuth();
  
  // Productos de panadería
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal de agregar/editar
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Campos del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    costo: '',
    tipo_pan: 'dulce',
    categoria_id: '',
    stock_actual: '50',
    stock_minimo: '10',
    imagen_url: ''
  });

  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarCatalogos();
  }, []);

  const cargarCatalogos = async () => {
    try {
      const [resProd, resCat] = await Promise.all([
        api.productos.getAll({ visible: 'all' }), // todos para admin
        api.productos.getCategorias()
      ]);
      if (resProd.success) setProductos(resProd.data);
      if (resCat.success) setCategorias(resCat.data);
    } catch (err) {
      console.error('Error al cargar inventario:', err);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  // Abrir Modal
  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      costo: '',
      tipo_pan: 'dulce',
      categoria_id: categorias[0]?.id || '',
      stock_actual: '50',
      stock_minimo: '10',
      imagen_url: ''
    });
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      nombre: product.nombre,
      descripcion: product.descripcion || '',
      precio: product.precio,
      costo: product.costo || '0.00',
      tipo_pan: product.tipo_pan,
      categoria_id: product.categoria_id || '',
      stock_actual: product.stock_actual,
      stock_minimo: product.stock_minimo,
      imagen_url: product.imagen_url || ''
    });
    setShowModal(true);
  };

  // Guardar Producto
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.precio || !formData.tipo_pan) {
      mostrarMensaje('danger', 'Los campos nombre, precio y tipo de pan son obligatorios');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        precio: parseFloat(formData.precio),
        costo: parseFloat(formData.costo || 0),
        categoria_id: formData.categoria_id ? parseInt(formData.categoria_id) : null,
        stock_actual: parseInt(formData.stock_actual || 0),
        stock_minimo: parseInt(formData.stock_minimo || 10)
      };

      let res;
      if (editingProduct) {
        res = await api.productos.update(editingProduct.id, payload);
      } else {
        res = await api.productos.create(payload);
      }

      if (res.success) {
        mostrarMensaje('success', editingProduct ? 'Producto actualizado.' : 'Producto creado.');
        setShowModal(false);
        cargarCatalogos();
      }
    } catch (err) {
      mostrarMensaje('danger', err.message || 'Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar Visibilidad (Toggle)
  const handleToggleVisibility = async (id) => {
    try {
      const res = await api.productos.toggleVisibility(id);
      if (res.success) {
        mostrarMensaje('success', res.message);
        cargarCatalogos();
      }
    } catch (err) {
      mostrarMensaje('danger', err.message || 'Error al cambiar visibilidad');
    }
  };

  // Filtrado de productos para la tabla
  const getFilteredProducts = () => {
    if (!searchQuery.trim()) return productos;
    const q = searchQuery.toLowerCase();
    return productos.filter(p => 
      p.nombre.toLowerCase().includes(q) || 
      (p.categoria_nombre && p.categoria_nombre.toLowerCase().includes(q))
    );
  };

  return (
    <div style={styles.container}>
      {mensaje.texto && (
        <div className={`alert alert-${mensaje.tipo}`} style={{ marginBottom: '24px' }}>
          {mensaje.texto}
        </div>
      )}

      {/* HEADER DE CONTROL */}
      <div style={styles.topControl}>
        <div style={styles.searchWrapper}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por nombre de pan o categoría..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '44px', width: '360px' }}
          />
        </div>

        {isAdmin && (
          <button onClick={openCreateModal} className="btn btn-primary">
            <Plus size={18} />
            <span>Agregar Producto</span>
          </button>
        )}
      </div>

      {/* ALERTA STOCK BAJO */}
      {productos.some(p => p.stock_actual <= p.stock_minimo && p.visible) && (
        <div className="alert alert-warning" style={{ marginBottom: '24px' }}>
          <TrendingDown size={18} />
          <span>Atención: Hay productos de panadería con niveles de stock por debajo del mínimo recomendado.</span>
        </div>
      )}

      {/* TABLA DE INVENTARIO */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Nombre del Pan</th>
              <th>Categoría</th>
              <th>Tipo de Masa</th>
              <th>Precio Venta</th>
              <th>Costo</th>
              <th>Stock Actual</th>
              <th>Stock Mínimo</th>
              <th>Estado</th>
              {isAdmin && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {getFilteredProducts().length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 10 : 9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                  No se encontraron productos en el inventario.
                </td>
              </tr>
            ) : (
              getFilteredProducts().map((product) => {
                const isLow = product.stock_actual <= product.stock_minimo;
                return (
                  <tr key={product.id}>
                    <td>
                      {product.imagen_url ? (
                        <img src={product.imagen_url} alt={product.nombre} style={styles.thumbImg} />
                      ) : (
                        <div style={styles.thumbPlaceholder}>🍞</div>
                      )}
                    </td>
                    <td style={{ fontWeight: '700' }}>{product.nombre}</td>
                    <td>{product.categoria_nombre || 'Sin categoría'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{product.tipo_pan}</td>
                    <td style={{ fontWeight: '700', color: 'var(--primary)' }}>
                      ${parseFloat(product.precio).toFixed(2)}
                    </td>
                    <td>${parseFloat(product.costo || 0).toFixed(2)}</td>
                    <td>
                      <span 
                        style={{ 
                          fontWeight: '800',
                          color: isLow ? 'var(--danger)' : 'var(--text-main)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {product.stock_actual}
                        {isLow && <AlertCircle size={14} color="var(--danger)" title="Stock Bajo" />}
                      </span>
                    </td>
                    <td>{product.stock_minimo}</td>
                    <td>
                      <span className={`badge badge-${product.visible ? 'success' : 'danger'}`}>
                        {product.visible ? 'Visible' : 'Oculto'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => openEditModal(product)}
                            className="btn btn-secondary" 
                            style={styles.actionBtn}
                            title="Editar Producto"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleToggleVisibility(product.id)}
                            className="btn btn-secondary" 
                            style={styles.actionBtn}
                            title={product.visible ? 'Ocultar en POS' : 'Mostrar en POS'}
                          >
                            {product.visible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE AGREGAR / EDITAR */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <Sparkles size={24} color="var(--primary)" />
              <h2 style={{ fontSize: '18px' }}>
                {editingProduct ? 'Editar Producto del Catálogo' : 'Agregar Nuevo Producto'}
              </h2>
            </div>

            <form onSubmit={handleSaveProduct} style={{ marginTop: '16px' }}>
              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Nombre del Producto</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Concha de Vainilla"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select
                    className="form-input form-select"
                    value={formData.categoria_id}
                    onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                  >
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Precio de Venta ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Costo de Elaboración ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={formData.costo}
                    onChange={(e) => setFormData({ ...formData, costo: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo de Masa / Pan</label>
                  <select
                    className="form-input form-select"
                    value={formData.tipo_pan}
                    onChange={(e) => setFormData({ ...formData, tipo_pan: e.target.value })}
                  >
                    <option value="dulce">Pan Dulce</option>
                    <option value="blanco">Pan Blanco (Bolillo/Telera)</option>
                    <option value="hojaldre">Hojaldre</option>
                    <option value="repostería">Repostería / Pastel</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">URL de Imagen (Opcional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://ejemplo.com/pan.jpg"
                    value={formData.imagen_url}
                    onChange={(e) => setFormData({ ...formData, imagen_url: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Stock Inicial</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.stock_actual}
                    onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Stock Mínimo Alerta</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.stock_minimo}
                    onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <label className="form-label">Descripción</label>
                <textarea
                  className="form-input"
                  placeholder="Detalles sobre el producto..."
                  rows="3"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={styles.modalFooter}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column'
  },
  topControl: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
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
  thumbImg: {
    width: '40px',
    height: '40px',
    objectFit: 'cover',
    borderRadius: '8px'
  },
  thumbPlaceholder: {
    width: '40px',
    height: '40px',
    backgroundColor: 'var(--primary-light)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px'
  },
  actionBtn: {
    padding: '6px 8px',
    borderRadius: '6px'
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
  modalCard: {
    width: '100%',
    maxWidth: '680px',
    padding: '32px'
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '12px',
    marginBottom: '16px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px 24px'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
    borderTop: '1px solid var(--border)',
    paddingTop: '16px'
  }
};
