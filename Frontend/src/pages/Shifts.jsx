import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Plus, 
  Info, 
  DollarSign, 
  ArrowUpRight, 
  CheckSquare, 
  Activity, 
  History,
  FileText
} from 'lucide-react';

export const Shifts = () => {
  const { user, turnoActivo, setShift, clearShift } = useAuth();
  
  // Estados para abrir turno
  const [tipoTurno, setTipoTurno] = useState('mañana');
  const [efectivoInicial, setEfectivoInicial] = useState('200');
  
  // Estados para retiros
  const [montoRetiro, setMontoRetiro] = useState('');
  const [tipoRetiro, setTipoRetiro] = useState('proveedor');
  const [motivoRetiro, setMotivoRetiro] = useState('');
  const [descRetiro, setDescRetiro] = useState('');
  const [retiros, setRetiros] = useState([]);

  // Estados para cerrar turno
  const [efectivoFinal, setEfectivoFinal] = useState('');
  const [observacionesCierre, setObservacionesCierre] = useState('');
  const [cierreReport, setCierreReport] = useState(null);

  // Historial de turnos
  const [historialTurnos, setHistorialTurnos] = useState([]);
  
  // Ventas y productos vendidos del turno activo
  const [ventasTurno, setVentasTurno] = useState([]);
  const [productosVendidos, setProductosVendidos] = useState({});
  
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [turnoActivo]);

  const cargarDatos = async () => {
    try {
      // Cargar historial de turnos
      const hist = await api.turnos.getHistorial();
      if (hist.success) {
        setHistorialTurnos(hist.data);
      }
      
      // Si hay turno activo, cargar las ventas y productos asociados
      if (turnoActivo) {
        // Recargar datos y sumas en tiempo real del turno activo
        try {
          const resActivo = await api.turnos.getActivo();
          if (resActivo.success) {
            setShift(resActivo.data);
          }
        } catch (e) {
          console.warn('Error al actualizar totales de turno:', e);
        }

        const resVentas = await api.ventas.getAll();
        if (resVentas.success) {
          const ventasDelTurno = resVentas.data.filter(
            v => v.turno_id === turnoActivo.id && v.estado === 'completada'
          );
          setVentasTurno(ventasDelTurno);
          
          const conteo = {};
          ventasDelTurno.forEach(v => {
            if (v.productos && Array.isArray(v.productos)) {
              v.productos.forEach(p => {
                const nombre = p.nombre_producto || p.nombre || 'Producto';
                conteo[nombre] = (conteo[nombre] || 0) + p.cantidad;
              });
            }
          });
          setProductosVendidos(conteo);
        }
      }
    } catch (error) {
      console.error('Error al cargar datos de turnos:', error);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  // Abrir Turno
  const handleAbrirTurno = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.turnos.iniciar(tipoTurno, parseFloat(efectivoInicial || 0));
      if (res.success) {
        setShift(res.data);
        mostrarMensaje('success', 'Turno de caja iniciado correctamente.');
        setCierreReport(null);
      }
    } catch (error) {
      mostrarMensaje('danger', error.message || 'Error al iniciar turno de caja');
    } finally {
      setLoading(false);
    }
  };

  // Registrar Retiro
  const handleRegistrarRetiro = async (e) => {
    e.preventDefault();
    if (!montoRetiro || parseFloat(montoRetiro) <= 0) {
      mostrarMensaje('danger', 'Ingrese un monto válido mayor a 0');
      return;
    }
    if (!motivoRetiro.trim()) {
      mostrarMensaje('danger', 'Ingrese un motivo para el retiro');
      return;
    }

    setLoading(true);
    try {
      const res = await api.turnos.registrarRetiro(turnoActivo.id, {
        monto: parseFloat(montoRetiro),
        tipo: tipoRetiro,
        motivo: motivoRetiro,
        descripcion: descRetiro
      });
      if (res.success) {
        mostrarMensaje('success', 'Retiro de caja registrado y guardado.');
        setMontoRetiro('');
        setMotivoRetiro('');
        setDescRetiro('');
        // Recargar datos para ver reflejado
        cargarDatos();
      }
    } catch (error) {
      mostrarMensaje('danger', error.message || 'Error al registrar retiro de caja');
    } finally {
      setLoading(false);
    }
  };

  // Cerrar Turno
  const handleCerrarTurno = async (e) => {
    e.preventDefault();
    if (!efectivoFinal || parseFloat(efectivoFinal) < 0) {
      mostrarMensaje('danger', 'Ingrese el efectivo final en caja');
      return;
    }

    setLoading(true);
    try {
      const res = await api.turnos.cerrar(
        turnoActivo.id, 
        parseFloat(efectivoFinal), 
        observacionesCierre
      );
      if (res.success) {
        setCierreReport(res.data.cierre_caja);
        clearShift();
        setEfectivoFinal('');
        setObservacionesCierre('');
        mostrarMensaje('success', 'Turno cerrado con éxito. Arqueo completado.');
        cargarDatos();
      }
    } catch (error) {
      mostrarMensaje('danger', error.message || 'Error al cerrar el turno');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {mensaje.texto && (
        <div className={`alert alert-${mensaje.tipo}`} style={{ marginBottom: '24px' }}>
          {mensaje.texto}
        </div>
      )}

      {/* ESTADO SIN TURNO ACTIVO - FORMULARIO DE APERTURA */}
      {!turnoActivo && !cierreReport && (
        <div style={styles.gridCenter}>
          <div className="card" style={styles.aperturaCard}>
            <div style={styles.aperturaHeader}>
              <Activity size={32} color="var(--primary)" />
              <h2 style={{ fontSize: '20px', marginTop: '12px' }}>Apertura de Caja Registradora</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Se requiere iniciar un turno de caja antes de registrar cualquier venta.
              </p>
            </div>

            <form onSubmit={handleAbrirTurno} style={{ marginTop: '24px' }}>
              <div className="form-group">
                <label className="form-label">Tipo de Turno</label>
                <select 
                  className="form-input form-select"
                  value={tipoTurno}
                  onChange={(e) => setTipoTurno(e.target.value)}
                >
                  <option value="mañana">Mañana (7:00 AM - 11:00 AM)</option>
                  <option value="noche">Noche (6:00 PM - 10:00 PM)</option>
                </select>
                <small style={styles.helpText}>
                  Nota: Se ha flexibilizado la validación de horas en desarrollo para pruebas.
                </small>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Efectivo Inicial en Caja (Fondo)</label>
                <div style={styles.inputIconWrapper}>
                  <DollarSign size={18} style={styles.inputIcon} />
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={efectivoInicial}
                    onChange={(e) => setEfectivoInicial(e.target.value)}
                    style={{ paddingLeft: '40px' }}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Abriendo Caja...' : 'Iniciar Turno de Caja'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REPORTE DE ULTIMO CIERRE DE CAJA */}
      {!turnoActivo && cierreReport && (
        <div style={{ marginBottom: '32px' }}>
          <div className="card" style={styles.cierreReportCard}>
            <div style={styles.cierreReportHeader}>
              <FileText size={28} color="var(--success)" />
              <h2 style={{ fontSize: '20px' }}>Resumen del Cierre de Caja</h2>
              <button 
                className="btn btn-secondary" 
                style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setCierreReport(null)}
              >
                Abrir Nuevo Turno
              </button>
            </div>
            
            {(() => {
              const dif = parseFloat(cierreReport.efectivo_final) - parseFloat(cierreReport.efectivo_calculado);
              const isOk = Math.abs(dif) < 0.05;
              const isSobrante = dif > 0.05;
              
              const alertStyle = {
                padding: '16px 20px',
                borderRadius: '12px',
                marginBottom: '24px',
                fontWeight: '700',
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: '1px solid',
                textAlign: 'left'
              };
              
              if (isOk) {
                return (
                  <div style={{ 
                    ...alertStyle, 
                    backgroundColor: 'var(--success-bg)', 
                    color: 'var(--success)', 
                    borderColor: 'var(--success)' 
                  }}>
                    <span>🟢 ¡Caja Cerrada con Éxito! El arqueo está CUADRADO perfectamente. No hay faltantes ni sobrantes.</span>
                  </div>
                );
              } else if (isSobrante) {
                return (
                  <div style={{ 
                    ...alertStyle, 
                    backgroundColor: 'var(--primary-light)', 
                    color: 'var(--primary)', 
                    borderColor: 'var(--primary)' 
                  }}>
                    <span>🔵 ¡Caja Cerrada con Éxito! Se detectó un SOBRANTE de ${dif.toFixed(2)} de acuerdo a lo que se vendió.</span>
                  </div>
                );
              } else {
                return (
                  <div style={{ 
                    ...alertStyle, 
                    backgroundColor: 'var(--danger-bg)', 
                    color: 'var(--danger)', 
                    borderColor: 'var(--danger)' 
                  }}>
                    <span>🔴 ¡Caja Cerrada con Éxito! Se detectó un FALTANTE de ${Math.abs(dif).toFixed(2)} de acuerdo a lo que se vendió.</span>
                  </div>
                );
              }
            })()}
            
            <div style={styles.cierreReportGrid}>
              <div style={styles.reportItem}>
                <span style={styles.reportLabel}>Empleado</span>
                <span style={styles.reportValue}>{cierreReport.empleado}</span>
              </div>
              <div style={styles.reportItem}>
                <span style={styles.reportLabel}>Fecha y Turno</span>
                <span style={styles.reportValue}>
                  {cierreReport.fecha.split('T')[0]} ({cierreReport.tipo_turno?.toUpperCase()})
                </span>
              </div>
              <div style={styles.reportItem}>
                <span style={styles.reportLabel}>Fondo Inicial (Apertura)</span>
                <span style={styles.reportValue}>
                  ${parseFloat(cierreReport.efectivo_inicial).toFixed(2)}
                </span>
              </div>
              <div style={styles.reportItem}>
                <span style={styles.reportLabel}>➕ Ventas en Efectivo</span>
                <span style={styles.reportValue} className="badge badge-success">
                  +${parseFloat(cierreReport.ventas_efectivo || 0).toFixed(2)}
                </span>
              </div>
              <div style={styles.reportItem}>
                <span style={styles.reportLabel}>💳 Ventas en Tarjeta</span>
                <span style={styles.reportValue} className="badge badge-info">
                  +${parseFloat(cierreReport.ventas_tarjeta || 0).toFixed(2)}
                </span>
              </div>
              <div style={styles.reportItem}>
                <span style={styles.reportLabel}>➖ Retiros de Caja</span>
                <span style={styles.reportValue} className="badge badge-danger">
                  -${parseFloat(cierreReport.retiros_totales || 0).toFixed(2)}
                </span>
              </div>
              <div style={styles.reportItem}>
                <span style={styles.reportLabel}>Efectivo Esperado en Caja</span>
                <span style={styles.reportValue} style={{ fontWeight: '800', color: 'var(--secondary)' }}>
                  ${parseFloat(cierreReport.efectivo_calculado).toFixed(2)}
                </span>
              </div>
              <div style={styles.reportItem}>
                <span style={styles.reportLabel}>Efectivo Físico Arqueado</span>
                <span style={styles.reportValue} style={{ fontWeight: '800', color: 'var(--primary)' }}>
                  ${parseFloat(cierreReport.efectivo_final).toFixed(2)}
                </span>
              </div>
              <div style={styles.reportItem}>
                <span style={styles.reportLabel}>Diferencia (Sobrante/Faltante)</span>
                {(() => {
                  const dif = parseFloat(cierreReport.efectivo_final) - parseFloat(cierreReport.efectivo_calculado);
                  const isOk = Math.abs(dif) < 0.05;
                  const isSobrante = dif > 0.05;
                  return (
                    <span 
                      style={{ 
                        fontWeight: '800', 
                        color: isOk ? 'var(--success)' : isSobrante ? 'var(--info)' : 'var(--danger)' 
                      }}
                    >
                      {isOk ? 'Cuadrado' : `${dif > 0 ? '+' : ''}${dif.toFixed(2)}`}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ESTADO CON TURNO ACTIVO - INTERFAZ DE TRABAJO */}
      {turnoActivo && (
        <>
          <div style={styles.workLayout}>
          {/* Columna Izquierda: Retiros de Efectivo */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={styles.cardHeader}>
              <ArrowUpRight size={24} color="var(--danger)" />
              <h2 style={{ fontSize: '18px' }}>Retiros de Caja</h2>
            </div>
            
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Registra retiros de efectivo realizados por compras a proveedores, gastos varios o resguardo.
            </p>

            <form onSubmit={handleRegistrarRetiro} style={styles.formContainer}>
              <div className="form-group">
                <label className="form-label">Monto del Retiro ($)</label>
                <div style={styles.inputIconWrapper}>
                  <DollarSign size={18} style={styles.inputIcon} />
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={montoRetiro}
                    onChange={(e) => setMontoRetiro(e.target.value)}
                    style={{ paddingLeft: '40px' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Categoría del Retiro</label>
                <select
                  className="form-input form-select"
                  value={tipoRetiro}
                  onChange={(e) => setTipoRetiro(e.target.value)}
                >
                  <option value="proveedor">Proveedor de Harina / Insumos</option>
                  <option value="gastos">Gastos Generales / Servicios</option>
                  <option value="seguridad">Retiro Parcial de Seguridad (Resguardo)</option>
                  <option value="otro">Otro Motivo</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Concepto / Motivo</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Pago a repartidor de huevo"
                  value={motivoRetiro}
                  onChange={(e) => setMotivoRetiro(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Detalles (Opcional)</label>
                <textarea
                  className="form-input"
                  placeholder="Especificaciones adicionales..."
                  rows="3"
                  value={descRetiro}
                  onChange={(e) => setDescRetiro(e.target.value)}
                  style={{ resize: 'none' }}
                />
              </div>

              <button type="submit" className="btn btn-danger" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
                <Plus size={16} />
                <span>Registrar Salida de Efectivo</span>
              </button>
            </form>
          </div>

          {/* Columna Derecha: Información del Turno e Arqueo de Cierre */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={styles.cardHeader}>
              <CheckSquare size={24} color="var(--success)" />
              <h2 style={{ fontSize: '18px' }}>Cierre y Arqueo de Caja</h2>
            </div>

            <div style={styles.shiftDetailsContainer}>
              <div style={styles.shiftDetailRow}>
                <span>Cajero:</span>
                <strong>{user?.nombre}</strong>
              </div>
              <div style={styles.shiftDetailRow}>
                <span>Tipo Turno:</span>
                <strong>{turnoActivo.tipo_turno?.toUpperCase()}</strong>
              </div>
              <div style={styles.shiftDetailRow}>
                <span>Fecha de Apertura:</span>
                <strong>{turnoActivo.fecha}</strong>
              </div>
              
              <hr style={{ border: 'none', borderTop: '1px dashed var(--border)', margin: '8px 0' }} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Auditoría de Caja (Tiempo Real)
                </span>
                
                <div style={styles.shiftDetailRow}>
                  <span>Fondo Inicial (Apertura):</span>
                  <strong>${parseFloat(turnoActivo.efectivo_inicial || 0).toFixed(2)}</strong>
                </div>
                <div style={styles.shiftDetailRow}>
                  <span>➕ Ventas en Efectivo:</span>
                  <strong style={{ color: 'var(--success)' }}>
                    +${parseFloat(turnoActivo.ventas_efoc || turnoActivo.ventas_efectivo || 0).toFixed(2)}
                  </strong>
                </div>
                <div style={styles.shiftDetailRow}>
                  <span>💳 Ventas en Tarjeta:</span>
                  <strong style={{ color: 'var(--info)' }}>
                    +${parseFloat(turnoActivo.ventas_tarjeta || 0).toFixed(2)}
                  </strong>
                </div>
                <div style={styles.shiftDetailRow}>
                  <span>➖ Retiros de Caja:</span>
                  <strong style={{ color: 'var(--danger)' }}>
                    -${parseFloat(turnoActivo.retiros_totales || 0).toFixed(2)}
                  </strong>
                </div>
                
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                
                <div style={{ ...styles.shiftDetailRow, fontSize: '14px', fontWeight: '800' }}>
                  <span>Efectivo Esperado en Caja:</span>
                  <span style={{ color: 'var(--secondary)' }}>
                    ${parseFloat(turnoActivo.efectivo_calculado || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />

            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Para cerrar el turno de caja, cuente el efectivo real disponible en el cajón y regístrelo para realizar el arqueo.
            </p>

            <form onSubmit={handleCerrarTurno} style={styles.formContainer}>
              <div className="form-group">
                <label className="form-label">Efectivo Final Físico ($)</label>
                <div style={styles.inputIconWrapper}>
                  <DollarSign size={18} style={styles.inputIcon} />
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={efectivoFinal}
                    onChange={(e) => setEfectivoFinal(e.target.value)}
                    style={{ paddingLeft: '40px' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Observaciones del Turno</label>
                <textarea
                  className="form-input"
                  placeholder="Detalles sobre faltantes, sobrantes o incidentes del turno..."
                  rows="3"
                  value={observacionesCierre}
                  onChange={(e) => setObservacionesCierre(e.target.value)}
                  style={{ resize: 'none' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
                <span>Proceder al Arqueo y Cerrar Caja</span>
              </button>
            </form>
          </div>
        </div>

        {/* RESUMEN DE VENTAS Y PANES VENDIDOS EN EL TURNO ACTIVO */}
        <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
          {/* Listado de Ventas Recientes del Turno */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
            <div style={styles.cardHeader}>
              <History size={20} color="var(--secondary)" />
              <h2 style={{ fontSize: '17px' }}>Ventas del Turno Activo</h2>
            </div>
            
            <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {ventasTurno.length === 0 ? (
                <div style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>
                  No se han registrado ventas en este turno todavía.
                </div>
              ) : (
                <table className="table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Hora</th>
                      <th>Método</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasTurno.map(v => (
                      <tr key={v.id}>
                        <td><strong style={{ fontFamily: 'monospace' }}>{v.folio}</strong></td>
                        <td>{new Date(v.creado_en).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>
                          <span className={`badge ${v.metodo_pago === 'efectivo' ? 'badge-success' : 'badge-info'}`}>
                            {v.metodo_pago.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700' }}>${parseFloat(v.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Unidades Vendidas (Corte de Panes) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
            <div style={styles.cardHeader}>
              <Activity size={20} color="var(--primary)" />
              <h2 style={{ fontSize: '17px' }}>Panes y Productos Vendidos</h2>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '280px' }}>
              {Object.keys(productosVendidos).length === 0 ? (
                <div style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>
                  No hay productos vendidos en este turno.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(productosVendidos).map(([nombre, cantidad]) => (
                    <div 
                      key={nombre} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        padding: '10px 14px', 
                        borderRadius: '8px', 
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        fontSize: '13px'
                      }}
                    >
                      <strong>{nombre}</strong>
                      <span style={{ color: 'var(--primary)', fontWeight: '800' }}>{cantidad} piezas</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    )}

      {/* HISTORIAL DE TURNOS */}
      <div style={{ marginTop: '32px' }}>
        <div style={styles.sectionHeader}>
          <History size={20} color="var(--secondary)" />
          <h2 style={{ fontSize: '18px' }}>Historial de Turnos de Caja</h2>
        </div>

        <div className="table-container" style={{ marginTop: '16px' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Cajero / Empleado</th>
                <th>Fecha</th>
                <th>Turno</th>
                <th>Efectivo Inicial</th>
                <th>Efectivo Reportado</th>
                <th>Efectivo Esperado</th>
                <th>Ventas</th>
                <th>Retiros</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {historialTurnos.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    No se han registrado turnos de caja previamente.
                  </td>
                </tr>
              ) : (
                historialTurnos.map((t) => {
                  const ventas = parseFloat(t.total_ventas_monto || 0);
                  const retiros = 0; // O sumatoria de retiros si viene estructurado
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: '700' }}>{t.empleado_nombre}</td>
                      <td>{t.fecha.split('T')[0]}</td>
                      <td style={{ textTransform: 'capitalize' }}>{t.tipo_turno}</td>
                      <td>${parseFloat(t.efectivo_inicial).toFixed(2)}</td>
                      <td>
                        {t.efectivo_final !== null 
                          ? `$${parseFloat(t.efectivo_final).toFixed(2)}` 
                          : '—'
                        }
                      </td>
                      <td>
                        {t.efectivo_final !== null 
                          ? `$${(parseFloat(t.efectivo_inicial) + ventas).toFixed(2)}` 
                          : '—'
                        }
                      </td>
                      <td style={{ color: 'var(--success)', fontWeight: '600' }}>
                        +${ventas.toFixed(2)}
                      </td>
                      <td style={{ color: 'var(--danger)', fontWeight: '600' }}>
                        {t.estado === 'cerrado' ? 'Ver cierre' : '—'}
                      </td>
                      <td>
                        <span className={`badge badge-${t.estado === 'abierto' ? 'success' : 'info'}`}>
                          {t.estado === 'abierto' ? 'Activo' : 'Cerrado'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column'
  },
  gridCenter: {
    display: 'flex',
    justifyContent: 'center',
    padding: '40px 0'
  },
  aperturaCard: {
    width: '100%',
    maxWidth: '480px',
    padding: '40px',
    textAlign: 'center'
  },
  aperturaHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  helpText: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '4px',
    fontWeight: '500'
  },
  inputIconWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%'
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
    color: 'var(--text-muted)'
  },
  workLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '32px'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '12px',
    marginBottom: '8px'
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  shiftDetailsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    backgroundColor: 'var(--background)',
    padding: '16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)'
  },
  shiftDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  cierreReportCard: {
    borderLeft: '6px solid var(--success)',
    padding: '24px 32px'
  },
  cierreReportHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '12px'
  },
  cierreReportGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px'
  },
  reportItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  reportLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: '0.5px'
  },
  reportValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--secondary)'
  }
};
