const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Attach dbClient to req
router.use((req, res, next) => {
    req.dbClient = req.app.get('dbClient');
    next();
});

/* =========================
   AUTH MIDDLEWARE (for /me)
========================= */
function auth(req, res, next) {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "No token" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
        req.userId = decoded.userId;

        if (!req.userId) return res.status(401).json({ error: "Invalid token" });
        next();
    } catch (e) {
        return res.status(401).json({ error: "Invalid token" });
    }
}

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

/* =========================
   PROFILE ROUTES (NEW)
   GET /api/users/me
   PUT /api/users/me
   DELETE /api/users/me
========================= */

// GET my profile (name, email, phone, address)
router.get("/me", auth, async (req, res) => {
    try {
        const result = await req.dbClient.query(
            `SELECT id, name, email, phone, address, is_owner
             FROM users
             WHERE id = $1`,
            [req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE my profile (name, phone, address)
router.put("/me", auth, async (req, res) => {
    try {
        const { name, phone, address } = req.body || {};

        const result = await req.dbClient.query(
            `UPDATE users
             SET name = $1,
                 phone = $2,
                 address = $3
             WHERE id = $4
             RETURNING id, name, email, phone, address, is_owner`,
            [name || "", phone || "", address || "", req.userId]
        );

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE my profile/account
router.delete("/me", auth, async (req, res) => {
    try {
        await req.dbClient.query(`DELETE FROM users WHERE id = $1`, [req.userId]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;