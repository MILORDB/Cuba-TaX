const express = require('express');
const { verifyToken } = require('../middleware/auth');
const {
    updateProfile,
    getMe,
    becomeDriver,
    saveVehicle,
    getVehicle,
    toggleAvailability,
    changePassword
} = require('../controllers/userController');
const router = express.Router();

router.get('/me', verifyToken, getMe);
router.put('/profile', verifyToken, updateProfile);
router.put('/change-password', verifyToken, changePassword);
router.put('/become-driver', verifyToken, becomeDriver);
router.get('/vehicle', verifyToken, getVehicle);
router.put('/vehicle', verifyToken, saveVehicle);
router.put('/toggle-availability', verifyToken, toggleAvailability);

module.exports = router;