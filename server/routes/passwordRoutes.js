// server/routes/passwordRoutes.js (READY TO PASTE)

const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { sendEmail } = require("../utils/email");

const router = express.Router();

/* =========================================================
   REQUEST PASSWORD RESET (email link)
   POST /api/password/request-reset
   body: { email }
========================================================= */
router.post("/request-reset", async (req, res) => {
    try {
        const db = req.app.get("dbClient") || req.app.get("db"); // supports your setup
        const { email } = req.body || {};

        if (!email) return res.status(400).json({ message: "Missing email" });

        const userRes = await db.query(
            `SELECT id, name, email FROM users WHERE email = $1`,
            [email]
        );

        // Always return ok (do not leak if email exists)
        if (userRes.rows.length === 0) {
            return res.json({ ok: true });
        }

        const user = userRes.rows[0];

        // Ensure table exists (safe create)
        await db.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        await db.query(
            `INSERT INTO password_resets (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
            [user.id, token, expiresAt]
        );

        const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
        const resetLink = `${clientUrl}/reset-password?token=${token}`;

        // ✅ If email fails, return 500 so frontend shows correct message
        try {
            await sendEmail({
                to: user.email,
                subject: "ToolRental Password Reset",
                text: `Hi ${user.name}, reset your password: ${resetLink}`,
                html: `
          <h2>Password Reset</h2>
          <p>Hi <b>${user.name}</b>,</p>
          <p>Click the link below to reset your password (valid for 30 minutes):</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
        `,
            });
        } catch (e) {
            console.error("❌ Reset email failed:", e?.message || e);
            return res.status(500).json({
                message:
                    "Email sending failed. Check EMAIL_FROM / EMAIL_USER / EMAIL_PASS in backend .env",
            });
        }

        return res.json({ ok: true });
    } catch (err) {
        console.error("request-reset error:", err);
        return res.status(500).json({ message: err.message || "Server error" });
    }
});

/* =========================================================
   RESET PASSWORD
   POST /api/password/reset
   body: { token, newPassword }
========================================================= */
router.post("/reset", async (req, res) => {
    try {
        const db = req.app.get("dbClient") || req.app.get("db");
        const { token, newPassword } = req.body || {};

        if (!token || !newPassword) {
            return res.status(400).json({ message: "Missing token or password" });
        }
        if (String(newPassword).length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const prRes = await db.query(
            `SELECT id, user_id, expires_at, used
       FROM password_resets
       WHERE token = $1`,
            [token]
        );

        if (prRes.rows.length === 0) {
            return res.status(400).json({ message: "Invalid token" });
        }

        const pr = prRes.rows[0];
        if (pr.used) return res.status(400).json({ message: "Token already used" });
        if (new Date(pr.expires_at).getTime() < Date.now()) {
            return res.status(400).json({ message: "Token expired" });
        }

        const hash = await bcrypt.hash(newPassword, 12);

        await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
            hash,
            pr.user_id,
        ]);

        await db.query(`UPDATE password_resets SET used = true WHERE id = $1`, [pr.id]);

        return res.json({ ok: true });
    } catch (err) {
        console.error("reset error:", err);
        return res.status(500).json({ message: err.message || "Server error" });
    }
});

module.exports = router;