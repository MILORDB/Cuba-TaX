const express = require('express');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const {
    createRequest,
    getMyRequest,
    listRequests,
    approveRequest,
    rejectRequest,
    checkSubscription,
} = require('../controllers/subscriptionController');
const router = express.Router();

// Conductor
router.post('/subscriptions/request', verifyToken, createRequest);
router.get('/subscriptions/my-request', verifyToken, getMyRequest);
router.get('/subscriptions/check', verifyToken, checkSubscription);

// Admin
router.get('/subscriptions', verifyToken, verifyAdmin, listRequests);
router.put('/subscriptions/:id/approve', verifyToken, verifyAdmin, approveRequest);
router.put('/subscriptions/:id/reject', verifyToken, verifyAdmin, rejectRequest);

module.exports = router;