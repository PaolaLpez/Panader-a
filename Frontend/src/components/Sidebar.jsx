import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShoppingBag, 
  Clock, 
  ClipboardList, 
  Users, 
  BarChart3, 
  LogOut,
  Sparkles,
  Receipt
} from 'lucide-react';

export const Sidebar = () => {
  const { logout, isAdmin } = useAuth();

  const menuItems = [
    { path: '/', label: 'Punto de Venta', icon: <ShoppingBag size={20} /> },
    { path: '/shifts', label: 'Caja Registradora', icon: <Clock size={20} /> },
    { path: '/inventory', label: 'Inventario', icon: <ClipboardList size={20} /> },
    ...(isAdmin ? [
      { path: '/employees', label: 'Personal / Empleados', icon: <Users size={20} /> },
      { path: '/reports', label: 'Analíticas y Reportes', icon: <BarChart3 size={20} /> }
    ] : [])
  ];

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brandContainer}>
        <div style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/logo_panapina.png" alt="PanaPina Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        </div>
        <div>
          <h2 className="brand-title" style={styles.brandName}>PanaPina</h2>
          <span style={styles.brandSubtitle}>Artesanos del Pan</span>
        </div>
      </div>
      
      <nav style={styles.nav}>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {})
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{
                  ...styles.iconContainer,
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {isActive && <div style={styles.activeIndicator} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={styles.footer}>
        <button onClick={logout} style={styles.logoutBtn}>
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

const styles = {
  sidebar: {
    width: '280px',
    backgroundColor: 'var(--card-bg)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    padding: '24px 16px',
    position: 'sticky',
    top: 0
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 8px 32px 8px',
    borderBottom: '1px solid var(--border)',
    marginBottom: '24px'
  },
  brandIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    backgroundColor: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(180, 83, 9, 0.3)'
  },
  brandName: {
    fontSize: '22px',
    color: 'var(--secondary)',
    lineHeight: '1'
  },
  brandSubtitle: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: '600',
    letterSpacing: '0.5px',
    textTransform: 'uppercase'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '12px',
    color: 'var(--text-muted)',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '15px',
    position: 'relative',
    transition: 'all 0.2s ease'
  },
  navLinkActive: {
    backgroundColor: 'var(--primary-light)',
    color: 'var(--primary-hover)'
  },
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  activeIndicator: {
    position: 'absolute',
    right: '0',
    top: '12px',
    bottom: '12px',
    width: '4px',
    borderRadius: '4px 0 0 4px',
    backgroundColor: 'var(--primary)'
  },
  footer: {
    paddingTop: '16px',
    borderTop: '1px solid var(--border)'
  },
  logoutBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--danger)',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '15px',
    transition: 'all 0.2s ease'
  }
};
