const express = require('express');
const { verifyToken } = require('../middleware/auth');
const {
    createTrip,
    getPendingTrips,
    acceptTrip,
    completeTrip,
    cancelTrip,
    getUserTrips,
    getAvailableVehicles,
    rejectTrip,
    updateLocation
} = require('../controllers/tripController');
const router = express.Router();

router.post('/trips', verifyToken, createTrip);
router.get('/trips/pending', verifyToken, getPendingTrips);
router.put('/trips/:id/accept', verifyToken, acceptTrip);
router.put('/trips/:id/reject', verifyToken, rejectTrip);
router.put('/trips/:id/complete', verifyToken, completeTrip);
router.put('/trips/:id/cancel', verifyToken, cancelTrip);
router.put('/trips/:id/location', verifyToken, updateLocation);
router.get('/trips/my', verifyToken, getUserTrips);
router.post('/trips/available-vehicles', verifyToken, getAvailableVehicles);

module.exports = router;