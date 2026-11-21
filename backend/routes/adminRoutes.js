const express = require('express');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const {
    getDrivers,
    getUsers,
    getActiveVehicles,
    getStats,
    getPaymentInfo,
    updatePaymentInfo,
    toggleBlockUser,
    deleteUser
} = require('../controllers/adminController');
const router = express.Router();

// Rutas de admin
router.get('/drivers', verifyToken, verifyAdmin, getDrivers);
router.get('/users', verifyToken, verifyAdmin, getUsers);
router.get('/active-vehicles', verifyToken, verifyAdmin, getActiveVehicles);
router.get('/stats', verifyToken, verifyAdmin, getStats);
router.put('/payment-info', verifyToken, verifyAdmin, updatePaymentInfo);
router.put('/users/:id/toggle-block', verifyToken, verifyAdmin, toggleBlockUser);
router.delete('/users/:id', verifyToken, verifyAdmin, deleteUser);

// Ruta pública para conductores
router.get('/payment-info', verifyToken, getPaymentInfo);

module.exports = router;