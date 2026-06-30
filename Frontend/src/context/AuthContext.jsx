import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => {
    try {
      return !!localStorage.getItem('panapina_token');
    } catch (e) {
      return false;
    }
  });
  const [turnoActivo, setTurnoActivo] = useState(null);

  // Verificar si hay token guardado al iniciar la aplicación
  useEffect(() => {
    const checkAuth = async () => {
      try {
        let token = null;
        try {
          token = localStorage.getItem('panapina_token');
        } catch (e) {
          console.warn('Unable to read token from localStorage:', e);
        }

        if (token) {
          // Verificar token con el backend
          const result = await api.auth.verifyToken();
          if (result && result.success) {
            // Cargar perfil completo
            const profile = await api.auth.getProfile();
            setUser({
              ...(result.user || {}),
              nombre: profile?.data?.empleado?.nombre_completo || result?.user?.nombre || 'Usuario',
              foto_url: profile?.data?.empleado?.foto_url,
              telefono: profile?.data?.empleado?.telefono,
            });
            
            // Buscar si tiene un turno activo hoy
            try {
              const shiftResult = await api.turnos.getActivo();
              if (shiftResult && shiftResult.success) {
                setTurnoActivo(shiftResult.data);
              }
            } catch (err) {
              setTurnoActivo(null);
            }
          } else {
            logout();
          }
        }
      } catch (error) {
        console.error('Error al verificar sesión:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Función para iniciar sesión
  const login = async (matricula, password) => {
    setLoading(true);
    try {
      const result = await api.auth.login(matricula, password);
      if (result && result.success && result.data?.token) {
        try {
          localStorage.setItem('panapina_token', result.data.token);
        } catch (e) {
          console.warn('Unable to write token to localStorage:', e);
        }
        setUser(result.data.user);
        
        // Cargar turno activo inmediatamente si existe
        try {
          const shiftResult = await api.turnos.getActivo();
          if (shiftResult && shiftResult.success) {
            setTurnoActivo(shiftResult.data);
          }
        } catch (err) {
          setTurnoActivo(null);
        }
        
        return { success: true };
      }
      return { success: false, message: result?.message || 'Error en inicio de sesión' };
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      return { success: false, message: error.message || 'Error de conexión con el servidor' };
    } finally {
      setLoading(false);
    }
  };

  // Función para cerrar sesión
  const logout = () => {
    try {
      localStorage.removeItem('panapina_token');
    } catch (e) {
      console.warn('Unable to clear token from localStorage:', e);
    }
    setUser(null);
    setTurnoActivo(null);
  };

  // Función de bypass de inicio de sesión directo para pruebas/demo
  const bypassLogin = () => {
    try {
      localStorage.setItem('panapina_token', 'mock_jwt_token_pana_pina');
    } catch (e) {
      console.warn('Unable to write mock token to localStorage:', e);
    }
    setUser({
      id: 1,
      matricula: 'AD-PanaPina-001',
      rol: 'admin',
      nombre: 'Administrador Demo (Bypass)',
      email: 'admin@panapina.local'
    });
  };

  // Funciones auxiliares para turnos de caja
  const setShift = (shift) => {
    setTurnoActivo(shift);
  };

  const clearShift = () => {
    setTurnoActivo(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        turnoActivo,
        login,
        logout,
        bypassLogin,
        setShift,
        clearShift,
        isAdmin: user?.rol === 'admin',
        isEmployee: user?.rol === 'empleado',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
