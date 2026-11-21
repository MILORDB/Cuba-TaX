const express = require('express');
const { verifyToken } = require('../middleware/auth');
const {
    createPatrolReport,
    getActivePatrols,
    deletePatrolReport,
} = require('../controllers/patrolController');
const router = express.Router();

router.post('/patrols', verifyToken, createPatrolReport);
router.get('/patrols/active', verifyToken, getActivePatrols);
router.delete('/patrols/:id', verifyToken, deletePatrolReport);

module.exports = router;