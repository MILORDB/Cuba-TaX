const express = require('express');
const cors = require('cors');
const { sequelize, testConnection } = require('./config/db');

// Rutas
const authRoutes = require('./routes/authRoutes');
const tripRoutes = require('./routes/tripRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const patrolRoutes = require('./routes/patrolRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');

// Modelos (para que sequelize los registre)
require('./models/PatrolReport');
require('./models/SubscriptionRequest');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api', authRoutes);
app.use('/api', tripRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', patrolRoutes);
app.use('/api', subscriptionRoutes);

app.get('/', (req, res) => {
    res.json({
        message: 'Cuba-TaX API funcionando',
        version: '1.0.0',
        endpoints: {
            auth: ['/api/register', '/api/login'],
            trips: ['/api/trips', '/api/trips/pending', '/api/trips/my'],
            users: ['/api/users/me', '/api/users/profile', '/api/users/vehicle', '/api/users/become-driver'],
            admin: ['/api/admin/drivers', '/api/admin/users', '/api/admin/active-vehicles', '/api/admin/stats'],
            patrols: ['/api/patrols', '/api/patrols/active'],
            subscriptions: ['/api/subscriptions/request', '/api/subscriptions/my-request', '/api/subscriptions', '/api/subscriptions/:id/approve']
        }
    });
});

const PORT = process.env.PORT || 3000;

testConnection();

sequelize.sync()
    .then(() => console.log('📦 Tablas sincronizadas correctamente'))
    .catch(err => console.error('Error en sincronización:', err));

app.listen(PORT, () => {
    console.log(`🚀 Servidor Cuba-TaX corriendo en http://localhost:${PORT}`);
});