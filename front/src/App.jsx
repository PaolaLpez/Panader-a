import { useEffect, useState } from 'react';
import { api } from './services/api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  const [user, setUser] = useState(() => api.getStoredUser());
  const [checking, setChecking] = useState(!!api.getToken());

  useEffect(() => {
    if (!api.getToken()) {
      setChecking(false);
      return;
    }

    api
      .verifyToken()
      .then(() => {
        const stored = api.getStoredUser();
        if (stored) setUser(stored);
      })
      .catch(() => {
        api.logout();
        setUser(null);
      })
      .finally(() => setChecking(false));
  }, []);

  function handleLogin(loggedUser) {
    setUser(loggedUser);
  }

  function handleLogout() {
    api.logout();
    setUser(null);
  }

  if (checking) {
    return (
      <div className="app-loading">
        <p>Cargando PanaPina…</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;
