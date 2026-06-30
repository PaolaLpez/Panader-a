const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('panapina_token');
}

function setToken(token) {
  if (token) {
    localStorage.setItem('panapina_token', token);
  } else {
    localStorage.removeItem('panapina_token');
  }
}

function getStoredUser() {
  const raw = localStorage.getItem('panapina_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  if (user) {
    localStorage.setItem('panapina_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('panapina_user');
  }
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || `Error ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  getToken,
  setToken,
  getStoredUser,
  setStoredUser,

  logout() {
    setToken(null);
    setStoredUser(null);
  },

  async login(matricula, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ matricula, password }),
    });

    if (data.data?.token) {
      setToken(data.data.token);
      setStoredUser(data.data.user);
    }

    return data;
  },

  async verifyToken() {
    return request('/auth/verify');
  },

  async getHealth() {
    return request('/health');
  },

  async getProductos() {
    return request('/productos');
  },

  async getProfile() {
    return request('/auth/profile');
  },
};
