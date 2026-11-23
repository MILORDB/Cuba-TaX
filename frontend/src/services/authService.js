import axios from 'axios';

// ============================================================
// CONFIGURACIÓN BASE DE AXIOS
// ============================================================
// En desarrollo local, el proxy de React (package.json) redirige /api al backend.
// En producción (Render), usamos la variable de entorno REACT_APP_API_URL.
const API_URL = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api`
  : '/api';

// ============================================================
// INTERCEPTOR GLOBAL DE AXIOS (Añade el token automáticamente)
// ============================================================
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// INTERCEPTOR DE RESPUESTAS (Si el token expira, cierra sesión)
// ============================================================
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Token inválido o expirado. Cerrando sesión...');
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================
// FUNCIONES DE AUTENTICACIÓN
// ============================================================
const register = (userData) => {
  return axios.post(`${API_URL}/register`, userData);
};

const login = (credentials) => {
  return axios.post(`${API_URL}/login`, credentials);
};

const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
};

const fetchCurrentUser = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const response = await axios.get(`${API_URL}/users/me`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return null;
  }
};

const getCurrentUser = () => {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(
        decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        )
      );
      return { ...decoded, tipo_usuario: decoded.tipo };
    } catch (e) {
      return null;
    }
  }
  return null;
};

const authService = {
  register,
  login,
  setAuthToken,
  fetchCurrentUser,
  getCurrentUser
};

export default authService;
