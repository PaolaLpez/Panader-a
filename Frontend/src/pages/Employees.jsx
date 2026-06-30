import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  UserPlus, 
  Mail, 
  Phone, 
  Calendar,
  KeyRound,
  Fingerprint,
  UserSquare2,
  Sparkles,
  Search
} from 'lucide-react';

export const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modales
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Formulario
  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
    telefono: '',
    fecha_nacimiento: '',
    rol: 'empleado',
    password: ''
  });

  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarEmpleados();
  }, []);

  const cargarEmpleados = async () => {
    try {
      const res = await api.empleados.getAll();
      if (res.success) {
        setEmployees(res.data);
      }
    } catch (err) {
      console.error('Error al cargar empleados:', err);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 6000);
  };

  const openCreateModal = () => {
    setEditingEmployee(null);
    setFormData({
      nombre_completo: '',
      email: '',
      telefono: '',
      fecha_nacimiento: '',
      rol: 'empleado',
      password: ''
    });
    setShowModal(true);
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      nombre_completo: emp.nombre_completo,
      email: emp.email,
      telefono: emp.telefono || '',
      fecha_nacimiento: emp.fecha_nacimiento ? emp.fecha_nacimiento.split('T')[0] : '',
      rol: emp.rol,
      password: '' // no editar contraseña en este modal por simplicidad
    });
    setShowModal(true);
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!formData.nombre_completo.trim() || !formData.email.trim() || !formData.fecha_nacimiento) {
      mostrarMensaje('danger', 'Ingrese el nombre, correo y fecha de nacimiento.');
      return;
    }

    if (!editingEmployee && !formData.password.trim()) {
      mostrarMensaje('danger', 'Ingrese una contraseña para el nuevo usuario.');
      return;
    }

    setLoading(true);
    try {
      if (editingEmployee) {
        // Actualizar empleado
        const res = await api.empleados.update(editingEmployee.id, {
          nombre_completo: formData.nombre_completo,
          email: formData.email,
          telefono: formData.telefono,
          fecha_nacimiento: formData.fecha_nacimiento
        });
        if (res.success) {
          mostrarMensaje('success', 'Perfil de empleado actualizado correctamente.');
          setShowModal(false);
          cargarEmpleados();
        }
      } else {
        // Crear empleado
        const res = await api.empleados.create(formData);
        if (res.success) {
          // El backend genera la matrícula automáticamente
          const matriculaGenerada = res.data.usuario.matricula;
          mostrarMensaje('success', `Empleado creado con éxito. Matrícula asignada: ${matriculaGenerada}. Escríbela para que pueda iniciar sesión.`);
          setShowModal(false);
          cargarEmpleados();
        }
      }
    } catch (err) {
      mostrarMensaje('danger', err.message || 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('¿Está seguro de que desea dar de baja a este empleado? Su usuario quedará inhabilitado para vender.')) {
      return;
    }

    try {
      const res = await api.empleados.delete(id);
      if (res.success) {
        mostrarMensaje('success', 'El empleado ha sido desactivado del sistema.');
        cargarEmpleados();
      }
    } catch (err) {
      mostrarMensaje('danger', err.message || 'Error al eliminar empleado');
    }
  };

  const getFilteredEmployees = () => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(e => 
      e.nombre_completo.toLowerCase().includes(q) || 
      e.matricula.toLowerCase().includes(q) || 
      e.email.toLowerCase().includes(q)
    );
  };

  return (
    <div style={styles.container}>
      {mensaje.texto && (
        <div className={`alert alert-${mensaje.tipo}`} style={{ marginBottom: '24px' }}>
          {mensaje.texto}
        </div>
      )}

      {/* HEADER CONTROLS */}
      <div style={styles.topControl}>
        <div style={styles.searchWrapper}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por nombre, matrícula o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '44px', width: '360px' }}
          />
        </div>

        <button onClick={openCreateModal} className="btn btn-primary">
          <UserPlus size={18} />
          <span>Contratar Personal</span>
        </button>
      </div>

      {/* TABLA DE EMPLEADOS */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Matrícula</th>
              <th>Nombre Completo</th>
              <th>Puesto / Rol</th>
              <th>Correo Electrónico</th>
              <th>Teléfono</th>
              <th>Fecha Nac. / Edad</th>
              <th>Ingreso al Sistema</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {getFilteredEmployees().length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                  No se encontraron empleados en la lista.
                </td>
              </tr>
            ) : (
              getFilteredEmployees().map((emp) => (
                <tr key={emp.id}>
                  <td style={{ fontWeight: '700', color: 'var(--primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Fingerprint size={14} />
                      <span>{emp.matricula}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: '700' }}>{emp.nombre_completo}</td>
                  <td>
                    <span className={`badge badge-${emp.rol === 'admin' ? 'success' : 'info'}`}>
                      {emp.rol === 'admin' ? 'Administrador' : 'Empleado POS'}
                    </span>
                  </td>
                  <td>{emp.email}</td>
                  <td>{emp.telefono || '—'}</td>
                  <td>
                    {emp.fecha_nacimiento ? (
                      <span>
                        {emp.fecha_nacimiento.split('T')[0]} ({emp.edad} años)
                      </span>
                    ) : '—'}
                  </td>
                  <td>{emp.creado_en ? emp.creado_en.split('T')[0] : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => openEditModal(emp)}
                        className="btn btn-secondary"
                        style={styles.actionBtn}
                        title="Editar Perfil"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="btn btn-secondary"
                        style={{ ...styles.actionBtn, color: 'var(--danger)' }}
                        title="Dar de Baja"
                        disabled={emp.matricula === 'AD-PanaPina-001'} // Evitar de baja al super admin
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE EMPLEADOS */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <Sparkles size={24} color="var(--primary)" />
              <h2>{editingEmployee ? 'Modificar Registro de Empleado' : 'Registrar Nuevo Empleado'}</h2>
            </div>

            <form onSubmit={handleSaveEmployee} style={{ marginTop: '16px' }}>
              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Nombre Completo</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Juan Pérez López"
                    value={formData.nombre_completo}
                    onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Correo Electrónico</label>
                  <div style={styles.iconInputWrapper}>
                    <Mail size={16} style={styles.inputIcon} />
                    <input
                      type="email"
                      className="form-input"
                      placeholder="correo@panapina.local"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ paddingLeft: '40px' }}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <div style={styles.iconInputWrapper}>
                    <Phone size={16} style={styles.inputIcon} />
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="555-123-4567"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      style={{ paddingLeft: '40px' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Fecha de Nacimiento</label>
                  <div style={styles.iconInputWrapper}>
                    <Calendar size={16} style={styles.inputIcon} />
                    <input
                      type="date"
                      className="form-input"
                      value={formData.fecha_nacimiento}
                      onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                      style={{ paddingLeft: '40px' }}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Rol en el Sistema</label>
                  <select
                    className="form-input form-select"
                    value={formData.rol}
                    onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                    disabled={!!editingEmployee} // No cambiar rol al editar en esta pantalla por seguridad
                  >
                    <option value="empleado">Empleado POS / Cajero</option>
                    <option value="admin">Administrador General</option>
                  </select>
                </div>

                {!editingEmployee && (
                  <div className="form-group">
                    <label className="form-label">Contraseña de Inicio</label>
                    <div style={styles.iconInputWrapper}>
                      <KeyRound size={16} style={styles.inputIcon} />
                      <input
                        type="password"
                        className="form-input"
                        placeholder="Contraseña inicial..."
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        style={{ paddingLeft: '40px' }}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {!editingEmployee && (
                <div style={styles.infoBanner}>
                  <UserSquare2 size={16} color="var(--info)" />
                  <span>
                    Nota: La matrícula de acceso (Matrícula) se creará automáticamente basada en las iniciales de su nombre.
                  </span>
                </div>
              )}

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
                  {loading ? 'Procesando...' : 'Guardar Empleado'}
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
    maxWidth: '640px',
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
  iconInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: 'var(--text-muted)'
  },
  infoBanner: {
    marginTop: '20px',
    padding: '12px 16px',
    backgroundColor: 'var(--info-bg)',
    color: 'var(--info)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '12px',
    fontWeight: '600'
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
