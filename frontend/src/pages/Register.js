import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import authService from '../services/authService';
import cubaData from '../data/cubaData.json';
import Layout from '../components/Layout';

const Register = () => {
  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
    telefono: '',
    ci: '',
    direccion: '',
    provincia: '',
    municipio: '',
    password: ''
  });
  const [municipios, setMunicipios] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleProvinciaChange = (e) => {
    const provinciaSeleccionada = e.target.value;
    setFormData({ ...formData, provincia: provinciaSeleccionada, municipio: '' });
    const prov = cubaData.provincias.find(p => p.nombre === provinciaSeleccionada);
    setMunicipios(prov ? prov.municipios : []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.provincia || !formData.municipio) {
      setError('Debes seleccionar provincia y municipio.');
      return;
    }

    try {
      const response = await authService.register(formData);
      setSuccess(response.data.message);
      authService.setAuthToken(response.data.token);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrarse');
    }
  };

  return (
    <Layout>
      <Container className="d-flex justify-content-center align-items-center py-5">
        <Card style={{ width: '100%', maxWidth: '600px' }} className="shadow-lg">
          <Card.Body className="p-4">
            <div className="text-center mb-4">
              <i className="fas fa-user-plus fa-3x text-primary mb-3"></i>
              <h2 className="fw-bold">Crear Cuenta</h2>
              <p className="text-muted">Regístrate en Cuba-TaX</p>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>
                  <i className="fas fa-user me-2"></i>Nombre Completo *
                </Form.Label>
                <Form.Control
                  type="text"
                  name="nombre_completo"
                  value={formData.nombre_completo}
                  onChange={handleChange}
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <i className="fas fa-envelope me-2"></i>Email *
                    </Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="ejemplo@correo.com"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <i className="fas fa-phone me-2"></i>Teléfono *
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleChange}
                      placeholder="55512345"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>
                  <i className="fas fa-id-card me-2"></i>CI (Carné de Identidad) *
                </Form.Label>
                <Form.Control
                  type="text"
                  name="ci"
                  value={formData.ci}
                  onChange={handleChange}
                  placeholder="19901234567"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>
                  <i className="fas fa-home me-2"></i>Dirección
                </Form.Label>
                <Form.Control
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  placeholder="Calle 23 #45, Vedado"
                />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <i className="fas fa-map-marked-alt me-2"></i>Provincia *
                    </Form.Label>
                    <Form.Select
                      name="provincia"
                      value={formData.provincia}
                      onChange={handleProvinciaChange}
                      required
                    >
                      <option value="">Selecciona una provincia</option>
                      {cubaData.provincias.map((prov) => (
                        <option key={prov.nombre} value={prov.nombre}>
                          {prov.nombre}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <i className="fas fa-city me-2"></i>Municipio *
                    </Form.Label>
                    <Form.Select
                      name="municipio"
                      value={formData.municipio}
                      onChange={handleChange}
                      required
                      disabled={!formData.provincia}
                    >
                      <option value="">Selecciona un municipio</option>
                      {municipios.map((mun) => (
                        <option key={mun} value={mun}>{mun}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>
                  <i className="fas fa-lock me-2"></i>Contraseña *
                </Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="******"
                  required
                />
              </Form.Group>

              <Button variant="primary" type="submit" className="w-100">
                <i className="fas fa-user-plus me-2"></i>Registrarse
              </Button>
            </Form>

            <div className="text-center mt-3">
              <p className="text-muted small">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-primary fw-bold">
                  Inicia sesión
                </Link>
              </p>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </Layout>
  );
};

export default Register;