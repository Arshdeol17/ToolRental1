const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Attach dbClient to req
router.use((req, res, next) => {
    req.dbClient = req.app.get('dbClient');
    next();
});

// Register POST /api/users/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, isOwner = false } = req.body;
        const passwordHash = await bcrypt.hash(password, 10);

        const result = await req.dbClient.query(
            'INSERT INTO users (email, password_hash, name, is_owner) VALUES ($1, $2, $3, $4) RETURNING id, email, name, is_owner',
            [email, passwordHash, name, isOwner]
        );

        const token = jwt.sign({ userId: result.rows[0].id }, process.env.JWT_SECRET || 'secret');
        res.json({ user: result.rows[0], token });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Login POST /api/users/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await req.dbClient.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret');
        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                is_owner: user.is_owner
            },
            token
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
