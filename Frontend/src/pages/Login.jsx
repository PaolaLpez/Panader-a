import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, KeyRound, UserSquare2, Eye, EyeOff } from 'lucide-react';

export const Login = () => {
  const { login, bypassLogin } = useAuth();
  const navigate = useNavigate();
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!matricula.trim() || !password.trim()) {
      setError('Por favor, ingresa tu matrícula y contraseña.');
      return;
    }

    setError('');
    setSubmitting(true);

    const res = await login(matricula, password);
    if (!res.success) {
      setError(res.message || 'Credenciales incorrectas. Intenta de nuevo.');
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginCard}>
        <div style={styles.header}>
          <div style={{ margin: '0 auto 16px auto', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logo_panapina.png" alt="PanaPina Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', boxShadow: '0 4px 12px rgba(180, 83, 9, 0.2)' }} />
          </div>
          <h1 className="brand-title" style={styles.title}>PanaPina</h1>
          <p style={styles.subtitle}>Inicia sesión para acceder al punto de venta y gestión</p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="matricula">Matrícula del Empleado</label>
            <div style={styles.inputWrapper}>
              <UserSquare2 size={18} style={styles.inputIcon} />
              <input
                id="matricula"
                type="text"
                className="form-input"
                placeholder="Ej. AD-PanaPina-001"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                disabled={submitting}
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label className="form-label" htmlFor="password">Contraseña</label>
            <div style={styles.inputWrapper}>
              <KeyRound size={18} style={styles.inputIcon} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                style={{ paddingLeft: '44px', paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                title={showPassword ? 'Ocultar Contraseña' : 'Ver Contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={styles.submitBtn}
          >
            {submitting ? 'Iniciando Sesión...' : 'Entrar al Horno'}
          </button>
        </form>


      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--background)',
    padding: '24px',
    backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
    backgroundSize: '24px 24px'
  },
  loginCard: {
    width: '100%',
    maxWidth: '460px',
    backgroundColor: 'var(--card-bg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-lg)',
    padding: '48px 40px',
    textAlign: 'center'
  },
  header: {
    marginBottom: '32px'
  },
  logoContainer: {
    width: '64px',
    height: '64px',
    borderRadius: '18px',
    backgroundColor: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px auto',
    boxShadow: '0 8px 20px rgba(180, 83, 9, 0.35)'
  },
  title: {
    fontSize: '32px',
    color: 'var(--secondary)',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    fontWeight: '500'
  },
  form: {
    marginBottom: '24px'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
    color: 'var(--text-muted)'
  },
  eyeBtn: {
    position: 'absolute',
    right: '16px',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    borderRadius: 'var(--radius-md)'
  }
};
