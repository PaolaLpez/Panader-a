import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Sun, 
  Moon, 
  User, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export const Header = ({ title }) => {
  const { user, turnoActivo } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem('panapina_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('panapina_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Obtener iniciales para avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <header style={styles.header}>
      <div>
        <h1 style={styles.title}>{title}</h1>
      </div>

      <div style={styles.rightContainer}>
        {/* Banner Modo Demo Offline */}
        {window.isPanapinaOffline && (
          <div style={styles.demoBadge}>
            <span style={styles.demoIndicator}>●</span>
            <span style={styles.demoText}>Modo Demo Local</span>
          </div>
        )}

        {/* Banner de Estado de Caja */}
        {turnoActivo ? (
          <div style={{ ...styles.shiftBadge, ...styles.shiftBadgeOpen }}>
            <CheckCircle size={16} color="var(--success)" />
            <div style={styles.badgeTextContainer}>
              <span style={styles.badgeLabel}>Caja Abierta ({turnoActivo.tipo_turno})</span>
              <span style={styles.badgeSub}>Ini: ${parseFloat(turnoActivo.efectivo_inicial).toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div style={{ ...styles.shiftBadge, ...styles.shiftBadgeClosed }}>
            <AlertTriangle size={16} color="var(--warning)" />
            <div style={styles.badgeTextContainer}>
              <span style={styles.badgeLabel}>Caja Cerrada</span>
              <span style={styles.badgeSub}>Sin Ventas Permitidas</span>
            </div>
          </div>
        )}

        {/* Botón de Tema */}
        <button onClick={toggleTheme} style={styles.themeToggleBtn} title="Cambiar Tema">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* Perfil de Usuario */}
        <div style={styles.profileContainer}>
          <div style={styles.avatar}>
            {user?.foto_url ? (
              <img src={user.foto_url} alt={user.nombre} style={styles.avatarImg} />
            ) : (
              <span style={styles.avatarText}>{getInitials(user?.nombre)}</span>
            )}
          </div>
          <div style={styles.userInfo}>
            <span style={styles.userName}>{user?.nombre || 'Usuario'}</span>
            <span style={styles.userRole}>
              {user?.rol === 'admin' ? 'Administrador' : 'Empleado'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

const styles = {
  header: {
    height: '80px',
    backgroundColor: 'var(--card-bg)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    flexShrink: 0
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--secondary)'
  },
  rightContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px'
  },
  shiftBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 16px',
    borderRadius: '12px',
    border: '1px solid'
  },
  shiftBadgeOpen: {
    backgroundColor: 'var(--success-bg)',
    borderColor: 'rgba(21, 128, 61, 0.15)',
    color: 'var(--success)'
  },
  shiftBadgeClosed: {
    backgroundColor: 'var(--warning-bg)',
    borderColor: 'rgba(161, 98, 7, 0.15)',
    color: 'var(--warning)'
  },
  badgeTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left'
  },
  badgeLabel: {
    fontSize: '12px',
    fontWeight: '700',
    lineHeight: '1.2'
  },
  badgeSub: {
    fontSize: '10px',
    fontWeight: '600',
    opacity: 0.8
  },
  themeToggleBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: 'var(--primary-light)',
      color: 'var(--primary)'
    }
  },
  profileContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
  },
  avatarText: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: '700'
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left'
  },
  userName: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-main)',
    lineHeight: '1.2'
  },
  userRole: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  demoBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '12px',
    backgroundColor: 'var(--primary-light)',
    border: '1px solid var(--primary)',
    color: 'var(--primary-hover)',
    fontWeight: '700',
    fontSize: '12px'
  },
  demoIndicator: {
    color: 'var(--primary)',
    animation: 'blink 1s infinite'
  },
  demoText: {
    fontSize: '11px'
  }
};
