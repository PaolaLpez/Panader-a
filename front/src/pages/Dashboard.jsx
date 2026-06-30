import { useEffect, useState } from 'react';
import { api } from '../services/api';
import './Dashboard.css';

export default function Dashboard({ user, onLogout }) {
  const [productos, setProductos] = useState([]);
  const [apiStatus, setApiStatus] = useState('loading');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [health, productosRes] = await Promise.all([
          api.getHealth(),
          api.getProductos(),
        ]);
        setApiStatus(health.status || 'ok');
        setProductos(productosRes.data || []);
      } catch (err) {
        setError(err.message);
        setApiStatus('error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>🥖 PanaPina</h1>
          <p>Bienvenido, {user?.nombre || user?.matricula}</p>
        </div>
        <button type="button" className="btn-logout" onClick={onLogout}>
          Cerrar sesión
        </button>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-card">
          <h2>Tu cuenta</h2>
          <dl className="info-list">
            <dt>Matrícula</dt>
            <dd>{user?.matricula}</dd>
            <dt>Rol</dt>
            <dd>{user?.rol}</dd>
            <dt>Correo</dt>
            <dd>{user?.email || '—'}</dd>
          </dl>
        </section>

        <section className="dashboard-card">
          <h2>Estado del sistema</h2>
          <p className={`status-badge status-${apiStatus}`}>
            API: {apiStatus}
          </p>
          {loading && <p>Cargando productos…</p>}
          {error && <p className="dashboard-error">{error}</p>}
          {!loading && !error && (
            <p className="productos-count">
              {productos.length} productos en catálogo
            </p>
          )}
        </section>

        {!loading && productos.length > 0 && (
          <section className="dashboard-card productos-preview">
            <h2>Productos (vista previa)</h2>
            <ul>
              {productos.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <span>{p.nombre}</span>
                  <strong>${Number(p.precio).toFixed(2)}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

