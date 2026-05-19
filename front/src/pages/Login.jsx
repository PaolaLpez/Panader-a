import { useState } from 'react';
import { api } from '../services/api';
import './Login.css';

export default function Login({ onLogin }) {
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await api.login(matricula.trim(), password);
      onLogin(result.data.user);
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <header className="login-header">
          <span className="login-logo" aria-hidden="true">🥖</span>
          <h1>PanaPina</h1>
          <p>Sistema de panadería</p>
        </header>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="matricula">Matrícula</label>
          <input
            id="matricula"
            type="text"
            placeholder="AD-PanaPina-001"
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            autoComplete="username"
            required
          />

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && <p className="login-error" role="alert">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="login-hint">
          Desarrollo: matrícula <code>AD-PanaPina-001</code> / contraseña <code>admin123</code>
        </p>
      </div>
    </div>
  );
}

