import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import authService from '../services/authService';
import cubaData from '../data/cubaData.json';

const EditarPerfil = () => {
  const [formData, setFormData] = useState({
    nombre_completo: '',
    telefono: '',
    direccion: '',
    provincia: '',
    municipio: ''
  });
  const [municipios, setMunicipios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
        const user = response.data;
        setFormData({
          nombre_completo: user.nombre_completo || '',
          telefono: user.telefono || '',
          direccion: user.direccion || '',
          provincia: user.provincia || '',
          municipio: user.municipio || ''
        });
        if (user.provincia) {
          const prov = cubaData.provincias.find(p => p.nombre === user.provincia);
          setMunicipios(prov ? prov.municipios : []);
        }
      } catch (err) {
        console.error(err);
        setError('Error al cargar perfil');
      } finally {
        setLoading(false);
      }
    };
    fetchPerfil();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'provincia') {
      const prov = cubaData.provincias.find(p => p.nombre === value);
      setMunicipios(prov ? prov.municipios : []);
      setFormData(prev => ({ ...prev, municipio: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await axios.put('/api/users/perfil', formData);
      setSuccess('Perfil actualizado exitosamente');
      setTimeout(() => navigate('/perfil'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar perfil');
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '10px' }}>
      <h2>Editar Perfil</h2>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: '10px' }}>{success}</div>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Nombre Completo</label>
          <input
            type="text"
            name="nombre_completo"
            value={formData.nombre_completo}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', margin: '5px 0' }}
          />
        </div>
        <div>
          <label>Teléfono</label>
          <input
            type="text"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', margin: '5px 0' }}
          />
        </div>
        <div>
          <label>Dirección</label>
          <input
            type="text"
            name="direccion"
            value={formData.direccion}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', margin: '5px 0' }}
          />
        </div>
        <div>
          <label>Provincia</label>
          <select
            name="provincia"
            value={formData.provincia}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', margin: '5px 0' }}
          >
            <option value="">Selecciona una provincia</option>
            {cubaData.provincias.map((prov) => (
              <option key={prov.nombre} value={prov.nombre}>
                {prov.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Municipio</label>
          <select
            name="municipio"
            value={formData.municipio}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', margin: '5px 0' }}
            disabled={!formData.provincia}
          >
            <option value="">Selecciona un municipio</option>
            {municipios.map((mun) => (
              <option key={mun} value={mun}>
                {mun}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px', marginTop: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>
          Guardar Cambios
        </button>
      </form>
    </div>
  );
};

export default EditarPerfil;