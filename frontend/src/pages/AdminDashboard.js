import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Button, Badge, Table,
  Alert, Spinner, Nav, Tab, Modal, Form
} from 'react-bootstrap';
import axios from 'axios';
import authService from '../services/authService';
import Layout from '../components/Layout';
import MapaVehiculosActivos from '../components/MapaVehiculosActivos';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeVehicles, setActiveVehicles] = useState([]);
  const [stats, setStats] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // ===== CONFIGURACIÓN DE PAGO =====
  const [numeroTarjeta, setNumeroTarjeta] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [currentCard, setCurrentCard] = useState(null);

  // ===== MODAL ELIMINAR =====
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ===== MODAL APROBAR =====
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [codigoAdmin, setCodigoAdmin] = useState('');
  const [notasAdmin, setNotasAdmin] = useState('');
  const [approveMessage, setApproveMessage] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);

  // ===== MODAL RECHAZAR =====
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectMessage, setRejectMessage] = useState('');

  // ============================================================
  // CARGAR USUARIO (siempre desde el backend)
  // ============================================================
  useEffect(() => {
    const cargarUsuario = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      authService.setAuthToken(token);

      try {
        console.log('🔍 AdminDashboard - Llamando a /api/users/me...');
        const response = await axios.get('/api/users/me');
        const userData = response.data;
        console.log('🔍 AdminDashboard - Usuario del backend:', userData);
        console.log('🔍 AdminDashboard - ID:', userData.id);
        console.log('🔍 AdminDashboard - Tipo:', userData.tipo_usuario);
        console.log('🔍 AdminDashboard - Nombre:', userData.nombre_completo);

        if (!userData || userData.tipo_usuario !== 'admin') {
          setError('No tienes permiso para acceder a este panel.');
          setTimeout(() => navigate('/dashboard'), 2000);
          return;
        }

        setUser({ ...userData, id: Number(userData.id) });
        if (userData.numero_tarjeta) {
          setNumeroTarjeta(userData.numero_tarjeta);
          setCurrentCard(userData.numero_tarjeta);
        }
      } catch (e) {
        console.error('❌ AdminDashboard - Error al cargar usuario:', e);
        const userData = authService.getCurrentUser();
        if (!userData || userData.tipo_usuario !== 'admin') {
          navigate('/login');
          return;
        }
        setUser({ ...userData, id: Number(userData.id) });
      }
    };
    cargarUsuario();
  }, [navigate]);

  // ============================================================
  // CARGAR DATOS DEL ADMIN
  // ============================================================
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [driversRes, usersRes, vehiclesRes, statsRes, subsRes, paymentRes] = await Promise.all([
        axios.get('/api/admin/drivers'),
        axios.get('/api/admin/users'),
        axios.get('/api/admin/active-vehicles'),
        axios.get('/api/admin/stats'),
        axios.get('/api/subscriptions'),
        axios.get('/api/admin/payment-info'),
      ]);
      setDrivers(driversRes.data);
      setUsers(usersRes.data);
      setActiveVehicles(vehiclesRes.data.vehiculos || []);
      setStats(statsRes.data);
      setSolicitudes(subsRes.data || []);
      if (paymentRes.data.numero_tarjeta) {
        setCurrentCard(paymentRes.data.numero_tarjeta);
        setNumeroTarjeta(paymentRes.data.numero_tarjeta);
      }
    } catch (error) {
      console.error(error);
      setError(error.response?.data?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchAll();
  }, [user, refresh, fetchAll]);

  // ============================================================
  // POLLING VEHÍCULOS ACTIVOS
  // ============================================================
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get('/api/admin/active-vehicles');
        setActiveVehicles(res.data.vehiculos || []);
      } catch (e) {
        console.error('Error al actualizar vehículos:', e);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // ============================================================
  // ACTUALIZAR TARJETA
  // ============================================================
  const handleUpdateCard = async (e) => {
    e.preventDefault();
    setPaymentMessage('');
    if (!numeroTarjeta.trim()) {
      setPaymentMessage('Debes ingresar un número de tarjeta.');
      return;
    }
    setPaymentLoading(true);
    try {
      const response = await axios.put('/api/admin/payment-info', {
        numero_tarjeta: numeroTarjeta.trim(),
      });
      setPaymentMessage(response.data.message);
      setCurrentCard(response.data.numero_tarjeta);
    } catch (error) {
      setPaymentMessage(error.response?.data?.message || 'Error al actualizar');
    } finally {
      setPaymentLoading(false);
    }
  };

  // ============================================================
  // BLOQUEAR / DESBLOQUEAR
  // ============================================================
  const toggleBlock = async (userId, nombreUsuario, estaBloqueado) => {
    const accion = estaBloqueado ? 'desbloquear' : 'bloquear';
    if (!window.confirm(`¿Seguro que quieres ${accion} la cuenta de ${nombreUsuario}?`)) return;

    try {
      const response = await axios.put(`/api/admin/users/${userId}/toggle-block`);
      setMensaje(response.data.message);
      setTimeout(() => setMensaje(''), 4000);
      setRefresh(!refresh);
    } catch (error) {
      alert(error.response?.data?.message || `Error al ${accion} usuario`);
    }
  };

  // ============================================================
  // ELIMINAR USUARIO
  // ============================================================
  const abrirModalEliminar = (u) => {
    setUserToDelete(u);
    setShowDeleteModal(true);
  };

  const confirmarEliminacion = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      const response = await axios.delete(`/api/admin/users/${userToDelete.id}`);
      setShowDeleteModal(false);
      setUserToDelete(null);
      setMensaje(response.data.message);
      setTimeout(() => setMensaje(''), 5000);
      setRefresh(!refresh);
    } catch (error) {
      alert(error.response?.data?.message || 'Error al eliminar usuario');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ============================================================
  // APROBAR / RECHAZAR
  // ============================================================
  const abrirAprobarModal = (solicitud) => {
    setSelectedRequest(solicitud);
    setCodigoAdmin('');
    setNotasAdmin('');
    setApproveMessage('');
    setShowApproveModal(true);
  };

  const confirmarAprobacion = async () => {
    setApproveMessage('');
    if (!codigoAdmin.trim()) {
      setApproveMessage('Debes ingresar el código.');
      return;
    }
    setApproveLoading(true);
    try {
      const response = await axios.put(
        `/api/subscriptions/${selectedRequest.id}/approve`,
        { codigo_admin: codigoAdmin.trim(), notas: notasAdmin.trim() || null }
      );
      setApproveMessage(response.data.message);
      setTimeout(() => {
        setShowApproveModal(false);
        setRefresh(!refresh);
      }, 2500);
    } catch (error) {
      setApproveMessage(error.response?.data?.message || 'Error al aprobar');
    } finally {
      setApproveLoading(false);
    }
  };

  const abrirRechazarModal = (solicitud) => {
    setSelectedRequest(solicitud);
    setRejectReason('');
    setRejectMessage('');
    setShowRejectModal(true);
  };

  const confirmarRechazo = async () => {
    setRejectMessage('');
    setApproveLoading(true);
    try {
      const response = await axios.put(
        `/api/subscriptions/${selectedRequest.id}/reject`,
        { motivo: rejectReason.trim() || 'Sin motivo especificado' }
      );
      setRejectMessage(response.data.message);
      setTimeout(() => {
        setShowRejectModal(false);
        setRefresh(!refresh);
      }, 2000);
    } catch (error) {
      setRejectMessage(error.response?.data?.message || 'Error al rechazar');
    } finally {
      setApproveLoading(false);
    }
  };

  // ============================================================
  // UTILIDADES
  // ============================================================
  const solicitudesPendientes = solicitudes.filter(s => s.estado === 'pendiente');
  const solicitudesAprobadas = solicitudes.filter(s => s.estado === 'aprobada');
  const solicitudesRechazadas = solicitudes.filter(s => s.estado === 'rechazada');
  const totalBloqueados = users.filter(u => u.bloqueado).length;

  // ============================================================
  // RENDER
  // ============================================================
  if (loading && !stats) {
    return (
      <Layout>
        <Container className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Cargando panel de administración...</p>
        </Container>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Container className="py-5">
          <Alert variant="danger">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container fluid className="py-4">
        {mensaje && (
          <Alert variant="success" dismissible onClose={() => setMensaje('')} className="shadow-sm">
            <i className="fas fa-check-circle me-2"></i>
            {mensaje}
          </Alert>
        )}

        {/* TÍTULO */}
        <Row className="mb-4">
          <Col>
            <Card className="shadow-lg border-0">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h2 className="fw-bold mb-1">
                      <i className="fas fa-shield-alt text-primary me-2"></i>
                      Panel de Administración
                    </h2>
                    <p className="text-muted mb-0">
                      Bienvenido, {user?.nombre_completo || user?.email}
                      {user?.tipo_usuario === 'admin' && (
                        <Badge bg="dark" className="ms-2">Admin</Badge>
                      )}
                    </p>
                    <p className="text-muted small mb-0">
                      ID: {user?.id} | Email: {user?.email}
                    </p>
                  </div>
                  <div>
                    <Button
                      variant="outline-primary"
                      onClick={() => setRefresh(!refresh)}
                      className="me-2"
                    >
                      <i className="fas fa-sync-alt me-2"></i>Refrescar
                    </Button>
                    <Button variant="outline-secondary" onClick={() => navigate('/dashboard')}>
                      <i className="fas fa-arrow-left me-2"></i>Volver
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* ESTADÍSTICAS */}
        {stats && (
          <Row className="mb-4">
            <Col md={2}>
              <Card className="shadow-sm border-0 border-start border-4 border-primary">
                <Card.Body>
                  <div className="d-flex justify-content-between">
                    <div>
                      <p className="text-muted small mb-1">Usuarios</p>
                      <h3 className="fw-bold mb-0">{stats.usuarios.total}</h3>
                    </div>
                    <i className="fas fa-users fa-2x text-primary opacity-50"></i>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={2}>
              <Card className="shadow-sm border-0 border-start border-4 border-success">
                <Card.Body>
                  <div className="d-flex justify-content-between">
                    <div>
                      <p className="text-muted small mb-1">Conductores</p>
                      <h3 className="fw-bold mb-0">{stats.usuarios.conductores}</h3>
                    </div>
                    <i className="fas fa-car fa-2x text-success opacity-50"></i>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={2}>
              <Card className="shadow-sm border-0 border-start border-4 border-warning">
                <Card.Body>
                  <div className="d-flex justify-content-between">
                    <div>
                      <p className="text-muted small mb-1">Vehículos Activos</p>
                      <h3 className="fw-bold mb-0">{activeVehicles.length}</h3>
                    </div>
                    <i className="fas fa-map-marker-alt fa-2x text-warning opacity-50"></i>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={2}>
              <Card className="shadow-sm border-0 border-start border-4 border-info">
                <Card.Body>
                  <div className="d-flex justify-content-between">
                    <div>
                      <p className="text-muted small mb-1">Solicitudes</p>
                      <h3 className="fw-bold mb-0">{solicitudesPendientes.length}</h3>
                    </div>
                    <i className="fas fa-id-card fa-2x text-info opacity-50"></i>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={2}>
              <Card className="shadow-sm border-0 border-start border-4 border-danger">
                <Card.Body>
                  <div className="d-flex justify-content-between">
                    <div>
                      <p className="text-muted small mb-1">Bloqueados</p>
                      <h3 className="fw-bold mb-0">{totalBloqueados}</h3>
                    </div>
                    <i className="fas fa-ban fa-2x text-danger opacity-50"></i>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={2}>
              <Card className="shadow-sm border-0 border-start border-4 border-secondary">
                <Card.Body>
                  <div className="d-flex justify-content-between">
                    <div>
                      <p className="text-muted small mb-1">Viajes</p>
                      <h3 className="fw-bold mb-0">{stats.viajes.total}</h3>
                    </div>
                    <i className="fas fa-route fa-2x text-secondary opacity-50"></i>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* PESTAÑAS */}
        <Tab.Container defaultActiveKey="suscripciones">
          <Card className="shadow-lg border-0">
            <Card.Header className="bg-white">
              <Nav variant="tabs" className="card-header-tabs">
                <Nav.Item>
                  <Nav.Link eventKey="suscripciones">
                    <i className="fas fa-id-card me-2"></i>
                    Suscripciones
                    {solicitudesPendientes.length > 0 && (
                      <Badge bg="danger" pill className="ms-2">
                        {solicitudesPendientes.length}
                      </Badge>
                    )}
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="configuracion">
                    <i className="fas fa-cog me-2"></i>Configuración
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="mapa">
                    <i className="fas fa-map-marked-alt me-2"></i>
                    Mapa en Vivo
                    {activeVehicles.length > 0 && (
                      <Badge bg="success" pill className="ms-2">
                        {activeVehicles.length}
                      </Badge>
                    )}
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="drivers">
                    <i className="fas fa-car me-2"></i>
                    Conductores
                    <Badge bg="secondary" pill className="ms-2">{drivers.length}</Badge>
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="users">
                    <i className="fas fa-users me-2"></i>
                    Usuarios
                    <Badge bg="secondary" pill className="ms-2">{users.length}</Badge>
                    {totalBloqueados > 0 && (
                      <Badge bg="danger" pill className="ms-1">
                        {totalBloqueados} bloq.
                      </Badge>
                    )}
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Card.Header>
            <Card.Body className="p-4">
              <Tab.Content>

                {/* ================= SUSCRIPCIONES ================= */}
                <Tab.Pane eventKey="suscripciones">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold mb-0">
                      <i className="fas fa-id-card me-2 text-primary"></i>
                      Solicitudes de Suscripción
                    </h5>
                    <div>
                      <Badge bg="warning" className="me-2">
                        Pendientes: {solicitudesPendientes.length}
                      </Badge>
                      <Badge bg="success" className="me-2">
                        Aprobadas: {solicitudesAprobadas.length}
                      </Badge>
                      <Badge bg="danger">
                        Rechazadas: {solicitudesRechazadas.length}
                      </Badge>
                    </div>
                  </div>

                  {solicitudes.length === 0 ? (
                    <Alert variant="info" className="text-center">
                      <i className="fas fa-info-circle me-2"></i>
                      No hay solicitudes de suscripción todavía.
                    </Alert>
                  ) : (
                    <>
                      {solicitudesPendientes.length > 0 && (
                        <>
                          <h6 className="fw-bold text-warning mb-3">
                            <i className="fas fa-hourglass-half me-2"></i>
                            Pendientes de aprobación
                          </h6>
                          <Row className="mb-4">
                            {solicitudesPendientes.map((s) => (
                              <Col md={6} key={s.id} className="mb-3">
                                <Card className="h-100 shadow-sm border-0 border-start border-4 border-warning">
                                  <Card.Body>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                      <Badge bg="warning" text="dark">
                                        <i className="fas fa-clock me-1"></i>Pendiente
                                      </Badge>
                                      <small className="text-muted">
                                        {new Date(s.createdAt).toLocaleString('es-CU')}
                                      </small>
                                    </div>

                                    <h6 className="fw-bold mb-2">
                                      <i className="fas fa-user me-2"></i>
                                      {s.conductor?.nombre_completo || 'Conductor'}
                                    </h6>

                                    <p className="mb-1 small">
                                      <i className="fas fa-envelope me-2 text-muted"></i>
                                      {s.conductor?.email}
                                    </p>
                                    <p className="mb-1 small">
                                      <i className="fas fa-phone me-2 text-muted"></i>
                                      {s.conductor?.telefono}
                                    </p>
                                    <p className="mb-3 small">
                                      <i className="fas fa-map-marker-alt me-2 text-muted"></i>
                                      {s.conductor?.municipio}, {s.conductor?.provincia}
                                    </p>

                                    <Alert variant="light" className="py-2 mb-3">
                                      <small className="text-muted d-block">
                                        <strong>Código del conductor:</strong>
                                      </small>
                                      <code style={{ fontSize: '1rem', letterSpacing: '2px' }}>
                                        {s.codigo_conductor}
                                      </code>
                                    </Alert>

                                    <div className="d-flex gap-2">
                                      <Button
                                        variant="success"
                                        className="flex-fill"
                                        onClick={() => abrirAprobarModal(s)}
                                      >
                                        <i className="fas fa-check-circle me-1"></i>Aprobar
                                      </Button>
                                      <Button
                                        variant="outline-danger"
                                        className="flex-fill"
                                        onClick={() => abrirRechazarModal(s)}
                                      >
                                        <i className="fas fa-times-circle me-1"></i>Rechazar
                                      </Button>
                                    </div>
                                  </Card.Body>
                                </Card>
                              </Col>
                            ))}
                          </Row>
                        </>
                      )}

                      {(solicitudesAprobadas.length > 0 || solicitudesRechazadas.length > 0) && (
                        <>
                          <h6 className="fw-bold text-secondary mb-3">
                            <i className="fas fa-history me-2"></i>
                            Historial
                          </h6>
                          <Table striped hover responsive className="align-middle">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Conductor</th>
                                <th>Código Conductor</th>
                                <th>Código Admin</th>
                                <th>Estado</th>
                                <th>Fecha</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...solicitudesAprobadas, ...solicitudesRechazadas].map((s, i) => (
                                <tr key={s.id}>
                                  <td>{i + 1}</td>
                                  <td>{s.conductor?.nombre_completo || 'N/A'}</td>
                                  <td><code>{s.codigo_conductor}</code></td>
                                  <td>{s.codigo_admin ? <code>{s.codigo_admin}</code> : 'N/A'}</td>
                                  <td>
                                    <Badge bg={s.estado === 'aprobada' ? 'success' : 'danger'}>
                                      {s.estado}
                                    </Badge>
                                  </td>
                                  <td>
                                    <small>
                                      {s.aprobado_en
                                        ? new Date(s.aprobado_en).toLocaleDateString('es-CU')
                                        : 'N/A'}
                                    </small>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </>
                      )}
                    </>
                  )}
                </Tab.Pane>

                {/* ================= CONFIGURACIÓN ================= */}
                <Tab.Pane eventKey="configuracion">
                  <h5 className="fw-bold mb-3">
                    <i className="fas fa-cog me-2 text-primary"></i>
                    Configuración de Pagos
                  </h5>

                  <Row>
                    <Col md={8}>
                      <Card className="shadow-sm border-0">
                        <Card.Body className="p-4">
                          <h6 className="fw-bold mb-3">
                            <i className="fas fa-credit-card me-2"></i>
                            Número de Tarjeta para Transferencias
                          </h6>

                          {paymentMessage && (
                            <Alert variant={paymentMessage.includes('actualizado') ? 'success' : 'danger'}>
                              {paymentMessage}
                            </Alert>
                          )}

                          {currentCard && (
                            <Alert variant="info" className="mb-3">
                              <i className="fas fa-credit-card me-2"></i>
                              <strong>Tarjeta actual:</strong>{' '}
                              <code style={{ fontSize: '1.1rem' }}>{currentCard}</code>
                            </Alert>
                          )}

                          <Form onSubmit={handleUpdateCard}>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-bold">
                                <i className="fas fa-credit-card me-2"></i>Número de tarjeta *
                              </Form.Label>
                              <Form.Control
                                type="text"
                                value={numeroTarjeta}
                                onChange={(e) => setNumeroTarjeta(e.target.value)}
                                placeholder="Ej: 1234 5678 9012 3456"
                                style={{ fontSize: '1.1rem', letterSpacing: '1px' }}
                              />
                            </Form.Group>

                            <Button
                              variant="primary"
                              type="submit"
                              disabled={paymentLoading}
                              className="w-100"
                            >
                              {paymentLoading ? (
                                <>
                                  <Spinner animation="border" size="sm" className="me-2" />
                                  Guardando...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-save me-2"></i>Guardar Tarjeta
                                </>
                              )}
                            </Button>
                          </Form>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab.Pane>

                {/* ================= MAPA EN VIVO ================= */}
                <Tab.Pane eventKey="mapa">
                  <h5 className="fw-bold mb-3">
                    <i className="fas fa-satellite-dish me-2 text-success"></i>
                    Vehículos activos en tiempo real
                  </h5>
                  {activeVehicles.length === 0 ? (
                    <Alert variant="info" className="text-center">
                      <i className="fas fa-info-circle me-2"></i>
                      No hay vehículos activos en este momento.
                    </Alert>
                  ) : (
                    <MapaVehiculosActivos vehiculos={activeVehicles} altura="600px" />
                  )}
                </Tab.Pane>

                {/* ================= CONDUCTORES ================= */}
                <Tab.Pane eventKey="drivers">
                  <h5 className="fw-bold mb-3">
                    <i className="fas fa-car me-2 text-primary"></i>
                    Lista de Conductores ({drivers.length})
                  </h5>
                  {drivers.length === 0 ? (
                    <Alert variant="info">No hay conductores registrados.</Alert>
                  ) : (
                    <Table striped hover responsive className="align-middle">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Nombre</th>
                          <th>Email</th>
                          <th>Teléfono</th>
                          <th>Zona</th>
                          <th>Vehículo</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drivers.map((d, i) => {
                          const tieneViaje = activeVehicles.some(v => Number(v.conductor?.id) === Number(d.id));
                          const subActiva = d.subscription_expires_at && new Date(d.subscription_expires_at) > new Date();
                          return (
                            <tr key={d.id}>
                              <td>{i + 1}</td>
                              <td>
                                {d.nombre_completo}
                                {d.bloqueado && (
                                  <Badge bg="danger" className="ms-2">
                                    <i className="fas fa-ban me-1"></i>Bloqueado
                                  </Badge>
                                )}
                              </td>
                              <td><small>{d.email}</small></td>
                              <td>{d.telefono}</td>
                              <td>
                                <Badge bg="secondary">
                                  {d.municipio}, {d.provincia}
                                </Badge>
                              </td>
                              <td>
                                {d.vehiculo_registrado ? (
                                  <Badge bg="success">
                                    {d.tipo_vehiculo?.replace('_', ' ')}
                                  </Badge>
                                ) : (
                                  <Badge bg="warning">Sin vehículo</Badge>
                                )}
                              </td>
                              <td>
                                <div className="d-flex flex-column gap-1">
                                  {tieneViaje && (
                                    <Badge bg="info">
                                      <i className="fas fa-car-side me-1"></i>En viaje
                                    </Badge>
                                  )}
                                  {subActiva ? (
                                    <Badge bg="success">
                                      <i className="fas fa-id-card me-1"></i>Sub. activa
                                    </Badge>
                                  ) : (
                                    <Badge bg="danger">
                                      <i className="fas fa-times me-1"></i>Sin sub.
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className="d-flex gap-1">
                                  <Button
                                    variant={d.bloqueado ? 'outline-success' : 'outline-danger'}
                                    size="sm"
                                    onClick={() => toggleBlock(d.id, d.nombre_completo, d.bloqueado)}
                                  >
                                    {d.bloqueado ? (
                                      <i className="fas fa-unlock"></i>
                                    ) : (
                                      <i className="fas fa-ban"></i>
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline-dark"
                                    size="sm"
                                    onClick={() => abrirModalEliminar(d)}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  )}
                </Tab.Pane>

                {/* ================= USUARIOS ================= */}
                <Tab.Pane eventKey="users">
                  <h5 className="fw-bold mb-3">
                    <i className="fas fa-users me-2 text-primary"></i>
                    Lista de Usuarios ({users.length})
                    {totalBloqueados > 0 && (
                      <Badge bg="danger" className="ms-2">
                        {totalBloqueados} bloqueado(s)
                      </Badge>
                    )}
                  </h5>
                  {users.length === 0 ? (
                    <Alert variant="info">No hay usuarios registrados.</Alert>
                  ) : (
                    <Table striped hover responsive className="align-middle">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Nombre</th>
                          <th>Email</th>
                          <th>Teléfono</th>
                          <th>Zona</th>
                          <th>Tipo</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u, i) => (
                          <tr key={u.id} className={u.bloqueado ? 'table-danger' : ''}>
                            <td>{i + 1}</td>
                            <td>
                              {u.nombre_completo}
                              {u.bloqueado && (
                                <Badge bg="danger" className="ms-2">
                                  <i className="fas fa-ban me-1"></i>Bloqueado
                                </Badge>
                              )}
                            </td>
                            <td><small>{u.email}</small></td>
                            <td>{u.telefono}</td>
                            <td>
                              {u.provincia && u.municipio ? (
                                <Badge bg="secondary">
                                  {u.municipio}, {u.provincia}
                                </Badge>
                              ) : 'N/A'}
                            </td>
                            <td>
                              <Badge
                                bg={
                                  u.tipo_usuario === 'admin'
                                    ? 'dark'
                                    : u.tipo_usuario === 'conductor'
                                    ? 'success'
                                    : 'primary'
                                }
                              >
                                {u.tipo_usuario}
                              </Badge>
                            </td>
                            <td>
                              {u.bloqueado ? (
                                <Badge bg="danger">
                                  <i className="fas fa-ban me-1"></i>Bloqueado
                                </Badge>
                              ) : (
                                <Badge bg="success">
                                  <i className="fas fa-check me-1"></i>Activo
                                </Badge>
                              )}
                            </td>
                            <td>
                              {u.tipo_usuario !== 'admin' && (
                                <div className="d-flex gap-1">
                                  <Button
                                    variant={u.bloqueado ? 'outline-success' : 'outline-danger'}
                                    size="sm"
                                    onClick={() => toggleBlock(u.id, u.nombre_completo, u.bloqueado)}
                                  >
                                    {u.bloqueado ? (
                                      <i className="fas fa-unlock"></i>
                                    ) : (
                                      <i className="fas fa-ban"></i>
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline-dark"
                                    size="sm"
                                    onClick={() => abrirModalEliminar(u)}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Tab.Pane>

              </Tab.Content>
            </Card.Body>
          </Card>
        </Tab.Container>
      </Container>

      {/* ================= MODAL ELIMINAR ================= */}
      <Modal
        show={showDeleteModal}
        onHide={() => {
          setShowDeleteModal(false);
          setUserToDelete(null);
        }}
        centered
      >
        <Modal.Header closeButton className="bg-dark text-white">
          <Modal.Title>
            <i className="fas fa-trash me-2"></i>Eliminar Cuenta
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {userToDelete && (
            <>
              <div className="text-center mb-4">
                <i className="fas fa-exclamation-triangle fa-4x text-danger mb-3"></i>
                <h5 className="fw-bold">¿Estás seguro?</h5>
                <p className="text-muted">
                  Estás a punto de eliminar permanentemente la cuenta de:
                </p>
                <Alert variant="danger" className="mb-3">
                  <strong>{userToDelete.nombre_completo}</strong>
                  <br />
                  <small>{userToDelete.email}</small>
                  <br />
                  <Badge bg={userToDelete.tipo_usuario === 'conductor' ? 'success' : 'primary'} className="mt-2">
                    {userToDelete.tipo_usuario}
                  </Badge>
                </Alert>
                <p className="text-danger small mb-0">
                  <i className="fas fa-exclamation-circle me-1"></i>
                  Esta acción NO se puede deshacer.
                </p>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowDeleteModal(false);
              setUserToDelete(null);
            }}
            disabled={deleteLoading}
          >
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmarEliminacion} disabled={deleteLoading}>
            {deleteLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Eliminando...
              </>
            ) : (
              <>
                <i className="fas fa-trash me-2"></i>Eliminar permanentemente
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ================= MODAL APROBAR ================= */}
      <Modal
        show={showApproveModal}
        onHide={() => {
          setShowApproveModal(false);
          setCodigoAdmin('');
          setNotasAdmin('');
          setApproveMessage('');
        }}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>
            <i className="fas fa-check-circle me-2"></i>Aprobar Suscripción
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedRequest && (
            <>
              <Alert variant="light" className="mb-3">
                <h6 className="fw-bold mb-2">
                  <i className="fas fa-user me-2"></i>
                  {selectedRequest.conductor?.nombre_completo}
                </h6>
                <p className="mb-1 small">
                  <strong>Código del conductor:</strong>{' '}
                  <code style={{ fontSize: '1rem', letterSpacing: '2px' }}>
                    {selectedRequest.codigo_conductor}
                  </code>
                </p>
              </Alert>

              {approveMessage && (
                <Alert variant={approveMessage.includes('aprobada') ? 'success' : 'danger'}>
                  {approveMessage}
                </Alert>
              )}

              <Form>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">
                    <i className="fas fa-key me-2"></i>Tu código de recepción *
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={codigoAdmin}
                    onChange={(e) => setCodigoAdmin(e.target.value.toUpperCase())}
                    placeholder="Ingresa el código que recibiste"
                    autoFocus
                    style={{ fontSize: '1.1rem', letterSpacing: '2px', textAlign: 'center' }}
                  />
                </Form.Group>
              </Form>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApproveModal(false)}>
            Cancelar
          </Button>
          <Button variant="success" onClick={confirmarAprobacion} disabled={approveLoading}>
            {approveLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Aprobando...
              </>
            ) : (
              <>
                <i className="fas fa-check me-2"></i>Aprobar
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ================= MODAL RECHAZAR ================= */}
      <Modal
        show={showRejectModal}
        onHide={() => {
          setShowRejectModal(false);
          setRejectReason('');
          setRejectMessage('');
        }}
        centered
      >
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title>
            <i className="fas fa-times-circle me-2"></i>Rechazar Solicitud
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedRequest && (
            <>
              <Alert variant="light" className="mb-3">
                <p className="mb-1">
                  <strong>Conductor:</strong> {selectedRequest.conductor?.nombre_completo}
                </p>
              </Alert>

              {rejectMessage && (
                <Alert variant={rejectMessage.includes('rechazada') ? 'success' : 'danger'}>
                  {rejectMessage}
                </Alert>
              )}

              <Form.Group className="mb-3">
                <Form.Label><i className="fas fa-comment me-2"></i>Motivo (opcional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ej: El código no coincide..."
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmarRechazo} disabled={approveLoading}>
            {approveLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Rechazando...
              </>
            ) : (
              <>
                <i className="fas fa-times me-2"></i>Confirmar Rechazo
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Layout>
  );
};

export default AdminDashboard;