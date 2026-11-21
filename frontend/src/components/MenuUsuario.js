import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';

const MenuUsuario = ({ user }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.setAuthToken(null);
    navigate('/login');
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={{
          background: '#007bff',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        👤 {user?.nombre_completo || user?.email}
      </button>
      {dropdownOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '110%',
            backgroundColor: 'white',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            borderRadius: '5px',
            minWidth: '180px',
            zIndex: 1000,
            border: '1px solid #ddd'
          }}
        >
          <Link
            to="/perfil"
            style={{
              display: 'block',
              padding: '10px 20px',
              textDecoration: 'none',
              color: '#333',
              borderBottom: '1px solid #eee'
            }}
            onClick={() => setDropdownOpen(false)}
          >
            👤 Mi Perfil
          </Link>
          <Link
            to="/editar-perfil"
            style={{
              display: 'block',
              padding: '10px 20px',
              textDecoration: 'none',
              color: '#333',
              borderBottom: '1px solid #eee'
            }}
            onClick={() => setDropdownOpen(false)}
          >
            ✏️ Editar Perfil
          </Link>
          <button
            onClick={() => {
              setDropdownOpen(false);
              handleLogout();
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              textAlign: 'left',
              color: '#d9534f',
              cursor: 'pointer'
            }}
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );
};

export default MenuUsuario;