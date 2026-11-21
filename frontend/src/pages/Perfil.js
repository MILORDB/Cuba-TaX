import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import authService from '../services/authService';

const Perfil = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    authService.setAuthToken(token);

    const fetchPerfil = async () => {
      try {
        const response = await axios.get('/api/users/perfil');
        setUser(response.data);
      } catch (err) {
        console.error(err);
        alert('Error al cargar perfil');
      } finally {
        setLoading(false);
      }
    };
    fetchPerfil();
  }, [navigate]);

  if (loading) return <div>Cargando perfil...</div>;
  if (!user) return <div>No se pudo cargar el perfil</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '10px' }}>
      <h2>Mi Perfil</h2>
      <p><strong>Nombre:</strong> {user.nombre_completo}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Teléfono:</strong> {user.telefono}</p>
      <p><strong>CI:</strong> {user.ci}</p>
      <p><strong>Dirección:</strong> {user.direccion || 'No especificada'}</p>
      <p><strong>Provincia:</strong> {user.provincia || 'No especificada'}</p>
      <p><strong>Municipio:</strong> {user.municipio || 'No especificado'}</p>
      <p><strong>Tipo:</strong> {user.tipo_usuario}</p>
      <button onClick={() => navigate('/editar-perfil')}>Editar Perfil</button>
    </div>
  );
};

export default Perfil;