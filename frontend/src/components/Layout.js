import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    authService.setAuthToken(null);
    navigate('/login');
  };

  return (
    <>
      <Navbar bg="primary" variant="dark" expand="lg" className="shadow-sm">
        <Container>
          <Navbar.Brand as={Link} to="/dashboard" className="fw-bold">
            <i className="fas fa-taxi me-2"></i>
            Cuba-TaX
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              {token && user && (
                <>
                  <Navbar.Text className="text-white me-3">
                    <i className="fas fa-user me-1"></i> {user.nombre_completo || user.email}
                  </Navbar.Text>
                  <Button variant="outline-light" size="sm" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt me-1"></i> Salir
                  </Button>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container className="mt-4">
        {children}
      </Container>
    </>
  );
};

export default Layout;