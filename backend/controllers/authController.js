// backend/controllers/authController.js
const { Op } = require('sequelize');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const { nombre_completo, email, telefono, ci, direccion, provincia, municipio, password } = req.body;

        // Verificar duplicados
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [{ email }, { telefono }, { ci }]
            }
        });

        if (existingUser) {
            return res.status(400).json({ 
                message: 'Ya existe un usuario con ese email, teléfono o CI' 
            });
        }

        // Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear usuario con los nuevos campos
        const newUser = await User.create({
            nombre_completo,
            email,
            telefono,
            ci,
            direccion,
            provincia: provincia || null,
            municipio: municipio || null,
            password: hashedPassword,
            tipo_usuario: 'pasajero' // Por defecto
        });

        // Generar token
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, tipo: newUser.tipo_usuario },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            token,
            user: {
                id: newUser.id,
                nombre_completo: newUser.nombre_completo,
                email: newUser.email,
                telefono: newUser.telefono,
                provincia: newUser.provincia,
                municipio: newUser.municipio,
                tipo_usuario: newUser.tipo_usuario
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'Email o contraseña incorrectos' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Email o contraseña incorrectos' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, tipo: user.tipo_usuario },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                nombre_completo: user.nombre_completo,
                email: user.email,
                telefono: user.telefono,
                provincia: user.provincia,
                municipio: user.municipio,
                tipo_usuario: user.tipo_usuario
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

module.exports = { register, login };