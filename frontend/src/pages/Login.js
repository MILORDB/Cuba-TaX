import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import authService from '../services/authService';
import Layout from '../components/Layout';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await authService.login({ email, password });
      authService.setAuthToken(response.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    }
  };

  return (
    <Layout>
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <Card style={{ width: '100%', maxWidth: '400px' }} className="shadow-lg">
          <Card.Body className="p-4">
            <div className="text-center mb-4">
              <i className="fas fa-taxi fa-3x text-primary mb-3"></i>
              <h2 className="fw-bold">Bienvenido</h2>
              <p className="text-muted">Inicia sesión en Cuba-TaX</p>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Contraseña</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  required
                />
              </Form.Group>

              <Button variant="primary" type="submit" className="w-100">
                <i className="fas fa-sign-in-alt me-2"></i> Iniciar Sesión
              </Button>
            </Form>

            <div className="text-center mt-3">
              <p className="text-muted small">
                ¿No tienes cuenta? <Link to="/register" className="text-primary fw-bold">Regístrate</Link>
              </p>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </Layout>
  );
};

export default Login;