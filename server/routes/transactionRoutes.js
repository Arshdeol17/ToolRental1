// server/routes/transactionRoutes.js (READY TO PASTE)

const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

/* =========================
   AUTH MIDDLEWARE
========================= */
function auth(req, res, next) {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "No token" });

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "toolrental-super-secret-2026"
        );

        req.userId = decoded.userId;
        if (!req.userId) return res.status(401).json({ message: "Invalid token payload" });

        next();
    } catch (e) {
        return res.status(401).json({ message: "Invalid token" });
    }
}

/* =========================================================
   GET MY TRANSACTIONS
   GET /api/transactions/my
========================================================= */
router.get("/my", auth, async (req, res) => {
    try {
        const db = req.app.get("db");
        const userId = Number(req.userId);

        const { rows } = await db.query(
            `
            SELECT
                tr.id,
                tr.rental_id,
                tr.tool_id,
                tr.payer_id,
                tr.receiver_id,
                tr.stripe_payment_intent_id,
                tr.stripe_checkout_session_id,
                tr.amount,
                tr.currency,
                tr.status,
                tr.created_at,

                t.name AS tool_name,
                t.image_url AS tool_image_url
            FROM transactions tr
            LEFT JOIN tools t ON t.id = tr.tool_id
            WHERE tr.payer_id = $1 OR tr.receiver_id = $1
            ORDER BY tr.created_at DESC
            `,
            [userId]
        );

        return res.json(rows);
    } catch (err) {
        console.error("transactions/my error:", err);
        return res.status(500).json({ message: err.message || "Server error" });
    }
});

module.exports = router;