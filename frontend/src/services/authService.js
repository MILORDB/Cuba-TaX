import axios from 'axios';

const API_URL = '/api';

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

// 🔑 NUEVA FUNCIÓN: obtiene el usuario completo desde el backend
const fetchCurrentUser = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    const response = await axios.get(`${API_URL}/users/me`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return null;
  }
};

// Fallback: leer datos del token (por compatibilidad)
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

// 🔑 IMPORTANTE: exportar como objeto nombrado y default
const authService = {
  register,
  login,
  setAuthToken,
  fetchCurrentUser,
  getCurrentUser
};

export default authService;