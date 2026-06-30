import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SVGChart } from '../components/SVGChart';
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Layers, 
  Calendar,
  AlertTriangle,
  Award,
  Wallet
} from 'lucide-react';

export const Reports = () => {
  const [fechaInicio, setFechaInicio] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [fechaFin, setFechaFin] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Datos de reportes
  const [ventasDiarias, setVentasDiarias] = useState([]);
  const [productosMasVendidos, setProductosMasVendidos] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [inventarioStats, setInventarioStats] = useState({
    total_productos: 0,
    productos_bajo_stock: 0,
    total_piezas: 0,
    valor_inventario: 0
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarReportes();
  }, [fechaInicio, fechaFin]);

  const cargarReportes = async () => {
    setLoading(true);
    try {
      const [resDiarias, resProductos, resInv, resMensual] = await Promise.all([
        api.reportes.ventasDiarias(fechaInicio, fechaFin),
        api.reportes.productosMasVendidos(fechaInicio, fechaFin, 8),
        api.reportes.inventario(),
        api.reportes.financieroMensual(new Date().getFullYear(), new Date().getMonth() + 1)
      ]);

      if (resDiarias.success) {
        // Formatear fechas para mostrar en gráfica
        const formatted = resDiarias.data.map(item => ({
          ...item,
          fecha_corta: item.fecha.split('T')[0].substring(5) // MM-DD
        }));
        // Revertir para orden cronológico en la gráfica
        setVentasDiarias(formatted.reverse());
      }

      if (resProductos.success) {
        setProductosMasVendidos(resProductos.data);
      }

      if (resInv.success && resInv.data.estadisticas) {
        setInventarioStats(resInv.data.estadisticas);
      }

      if (resMensual.success && resMensual.data.metodos_pago) {
        setMetodosPago(resMensual.data.metodos_pago);
      }
    } catch (err) {
      console.error('Error al cargar reportes financieros:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calcular total ingresos del periodo
  const getIngresosPeriodo = () => {
    return ventasDiarias.reduce((sum, item) => sum + parseFloat(item.ingreso_total || 0), 0);
  };

  // Calcular total transacciones del periodo
  const getVentasPeriodo = () => {
    return ventasDiarias.reduce((sum, item) => sum + parseInt(item.total_ventas || 0), 0);
  };

  return (
    <div style={styles.container}>
      {/* SECCIÓN DE FILTROS POR FECHA */}
      <div style={styles.filterCard} className="card">
        <div style={styles.filterTitle}>
          <Calendar size={18} color="var(--primary)" />
          <span style={{ fontWeight: '700', fontSize: '14px' }}>Rango del Reporte</span>
        </div>
        <div style={styles.filterInputs}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Desde</label>
            <input 
              type="date" 
              className="form-input" 
              value={fechaInicio} 
              onChange={(e) => setFechaInicio(e.target.value)} 
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Hasta</label>
            <input 
              type="date" 
              className="form-input" 
              value={fechaFin} 
              onChange={(e) => setFechaFin(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* TARJETAS RESUMEN (KPIS) */}
      <div style={styles.kpiGrid}>
        <div className="card" style={styles.kpiCard}>
          <div style={{ ...styles.kpiIconWrapper, backgroundColor: 'var(--success-bg)' }}>
            <DollarSign size={20} color="var(--success)" />
          </div>
          <div style={styles.kpiTextContainer}>
            <span style={styles.kpiLabel}>Ingresos del Periodo</span>
            <span style={styles.kpiValue}>${getIngresosPeriodo().toFixed(2)}</span>
          </div>
        </div>

        <div className="card" style={styles.kpiCard}>
          <div style={{ ...styles.kpiIconWrapper, backgroundColor: 'var(--info-bg)' }}>
            <ShoppingBag size={20} color="var(--info)" />
          </div>
          <div style={styles.kpiTextContainer}>
            <span style={styles.kpiLabel}>Ventas Realizadas</span>
            <span style={styles.kpiValue}>{getVentasPeriodo()} órdenes</span>
          </div>
        </div>

        <div className="card" style={styles.kpiCard}>
          <div style={{ ...styles.kpiIconWrapper, backgroundColor: 'var(--warning-bg)' }}>
            <Layers size={20} color="var(--warning)" />
          </div>
          <div style={styles.kpiTextContainer}>
            <span style={styles.kpiLabel}>Valor del Inventario</span>
            <span style={styles.kpiValue}>
              ${parseFloat(inventarioStats.valor_inventario || 0).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="card" style={styles.kpiCard}>
          <div style={{ ...styles.kpiIconWrapper, backgroundColor: 'var(--danger-bg)' }}>
            <AlertTriangle size={20} color="var(--danger)" />
          </div>
          <div style={styles.kpiTextContainer}>
            <span style={styles.kpiLabel}>Productos con Bajo Stock</span>
            <span style={styles.kpiValue}>{inventarioStats.productos_bajo_stock} alertas</span>
          </div>
        </div>
      </div>

      {/* GRÁFICAS */}
      <div style={styles.chartsGrid}>
        {/* Gráfica de Ventas Diarias */}
        <div className="card" style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Tendencia de Ingresos Diarios ($)</h3>
          <p style={styles.chartSub}>Ingresos diarios capturados en el periodo seleccionado</p>
          <div style={{ marginTop: '20px' }}>
            <SVGChart 
              type="line" 
              data={ventasDiarias} 
              xKey="fecha_corta" 
              yKey="ingreso_total" 
              height={180} 
            />
          </div>
        </div>

        {/* Métodos de Pago más Utilizados */}
        <div className="card" style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Desglose de Métodos de Pago</h3>
          <p style={styles.chartSub}>Distribución de cobros realizados en el mes corriente</p>
          
          <div style={styles.paymentMethodsContainer}>
            {metodosPago.length === 0 ? (
              <div style={styles.emptyContainer}>Sin transacciones este mes</div>
            ) : (
              metodosPago.map((item, idx) => {
                const totalMonto = metodosPago.reduce((sum, i) => sum + parseFloat(i.monto_total), 0);
                const pct = ((parseFloat(item.monto_total) / totalMonto) * 100).toFixed(0);
                return (
                  <div key={idx} style={styles.paymentMethodRow}>
                    <div style={styles.payIconWrapper}>
                      <Wallet size={16} color="var(--primary)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={styles.payRowInfo}>
                        <span style={{ fontWeight: '700', textTransform: 'capitalize' }}>
                          {item.metodo_pago}
                        </span>
                        <strong>${parseFloat(item.monto_total).toFixed(2)} ({pct}%)</strong>
                      </div>
                      <div style={styles.progressBarBg}>
                        <div 
                          style={{ 
                            ...styles.progressBarFill, 
                            width: `${pct}%`,
                            backgroundColor: item.metodo_pago === 'efectivo' ? 'var(--primary)' : 'var(--info)'
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* PRODUCTOS MÁS VENDIDOS Y DETALLES */}
      <div style={{ marginTop: '32px' }}>
        <div className="card">
          <div style={styles.rankHeader}>
            <Award size={22} color="var(--primary)" />
            <h3>Productos Más Vendidos (Top de Ventas)</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Listado de panes, refrigeración y abarrotes con mayor rotación de salida en el periodo.
          </p>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th># Ranking</th>
                  <th>Producto</th>
                  <th>Tipo de Producto</th>
                  <th>Cantidad Vendida</th>
                  <th>Ingreso Total Generado</th>
                </tr>
              </thead>
              <tbody>
                {productosMasVendidos.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      No se han registrado ventas en el periodo seleccionado.
                    </td>
                  </tr>
                ) : (
                  productosMasVendidos.map((prod, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: '800', color: 'var(--primary)' }}>#{idx + 1}</td>
                      <td style={{ fontWeight: '700' }}>{prod.nombre_producto}</td>
                      <td style={{ textTransform: 'capitalize' }}>
                        <span className={`badge badge-${
                          prod.tipo_producto === 'pan' ? 'success' : prod.tipo_producto === 'refri' ? 'info' : 'warning'
                        }`}>
                          {prod.tipo_producto === 'pan' ? 'Panadería' : prod.tipo_producto === 'refri' ? 'Refrigerador' : 'Tienda'}
                        </span>
                      </td>
                      <td style={{ fontWeight: '700' }}>{prod.total_vendido} piezas</td>
                      <td style={{ fontWeight: '800', color: 'var(--secondary)' }}>
                        ${parseFloat(prod.ingreso_generado).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
  filterCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    marginBottom: '24px'
  },
  filterTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  filterInputs: {
    display: 'flex',
    gap: '24px'
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '24px',
    marginBottom: '32px'
  },
  kpiCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px'
  },
  kpiIconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  kpiTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left'
  },
  kpiLabel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: '600'
  },
  kpiValue: {
    fontSize: '20px',
    fontWeight: '800',
    color: 'var(--secondary)'
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: '32px'
  },
  chartCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column'
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--secondary)'
  },
  chartSub: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '2px'
  },
  paymentMethodsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '20px',
    justifyContent: 'center',
    flex: 1
  },
  paymentMethodRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  payIconWrapper: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'var(--primary-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  payRowInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    marginBottom: '4px'
  },
  progressBarBg: {
    width: '100%',
    height: '6px',
    backgroundColor: 'var(--border)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '3px'
  },
  emptyContainer: {
    padding: '32px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '13px',
    fontWeight: '500'
  },
  rankHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '4px'
  }
};
