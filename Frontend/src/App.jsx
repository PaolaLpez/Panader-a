import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { POS } from './pages/POS';
import { Shifts } from './pages/Shifts';
import { Inventory } from './pages/Inventory';
import { Employees } from './pages/Employees';
import { Reports } from './pages/Reports';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatboxWidget } from './components/ChatboxWidget';

// Componente para proteger rutas privadas
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>🍞</div>
        <div className="brand-title" style={styles.loadingText}>Cargando PanaPina...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Componente para restringir acceso a login cuando ya se está autenticado
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>🍞</div>
        <div className="brand-title" style={styles.loadingText}>Cargando PanaPina...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Contenedor del Layout Principal que inyecta Header y Sidebar
const AppLayout = ({ children }) => {
  const location = useLocation();

  // Determinar título del Header según la ruta actual
  const getHeaderTitle = () => {
    switch (location.pathname) {
      case '/': return 'Terminal Punto de Venta (POS)';
      case '/shifts': return 'Caja Registradora y Arqueo';
      case '/inventory': return 'Control de Catálogo e Inventario';
      case '/employees': return 'Gestión de Personal de Panadería';
      case '/reports': return 'Panel de Analíticas y Finanzas';
      default: return 'PanaPina POS';
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <Header title={getHeaderTitle()} />
        <main className="dashboard-content">
          {children}
        </main>
      </div>
      <ChatboxWidget />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta Pública: Login */}
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />

          {/* Rutas Privadas Protegidas */}
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout>
                <POS />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/shifts" element={
            <ProtectedRoute>
              <AppLayout>
                <Shifts />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/inventory" element={
            <ProtectedRoute>
              <AppLayout>
                <Inventory />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/employees" element={
            <ProtectedRoute requireAdmin={true}>
              <AppLayout>
                <Employees />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/reports" element={
            <ProtectedRoute requireAdmin={true}>
              <AppLayout>
                <Reports />
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

const styles = {
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--background)',
    gap: '16px'
  },
  loadingSpinner: {
    fontSize: '56px',
    animation: 'spin 1.5s linear infinite'
  },
  loadingText: {
    fontSize: '24px',
    color: 'var(--secondary)'
  }
};

// Agregar animación de rebote/giro para el cargador de pan
const styleSheet = document.styleSheets[0];
if (styleSheet) {
  try {
    styleSheet.insertRule(`
      @keyframes spin {
        0% { transform: scale(1) rotate(0deg); }
        50% { transform: scale(1.2) rotate(180deg); }
        100% { transform: scale(1) rotate(360deg); }
      }
    `, styleSheet.cssRules.length);
    styleSheet.insertRule(`
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.2; }
      }
    `, styleSheet.cssRules.length);
  } catch (e) {
    console.warn('Could not insert CSS rule: ', e);
  }
}

export default App;
