const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ GET/CREATE conversation by rentalId
router.get("/conversation/:rentalId", authMiddleware, async (req, res) => {
    const db = req.app.get("db");
    const { rentalId } = req.params;
    const userId = req.userId;

    try {
        // Rental must exist and user must be owner or renter
        const rentalCheck = await db.query(
            `SELECT r.id, r.renter_id, t.owner_id
       FROM rentals r
       JOIN tools t ON t.id = r.tool_id
       WHERE r.id = $1`,
            [rentalId]
        );

        if (rentalCheck.rows.length === 0) {
            return res.status(404).json({ message: "Rental not found" });
        }

        const { owner_id, renter_id } = rentalCheck.rows[0];

        if (String(userId) !== String(owner_id) && String(userId) !== String(renter_id)) {
            return res.status(403).json({ message: "Not allowed" });
        }

        // Existing conversation?
        const existing = await db.query(
            `SELECT * FROM conversations WHERE rental_id = $1`,
            [rentalId]
        );

        if (existing.rows.length > 0) return res.json(existing.rows[0]);

        // Create conversation
        const created = await db.query(
            `INSERT INTO conversations (rental_id, owner_id, renter_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [rentalId, owner_id, renter_id]
        );

        return res.json(created.rows[0]);
    } catch (err) {
        console.error("conversation error:", err.message);
        return res.status(500).json({ message: "Server error" });
    }
});

// ✅ GET messages
router.get("/messages/:conversationId", authMiddleware, async (req, res) => {
    const db = req.app.get("db");
    const { conversationId } = req.params;
    const userId = req.userId;

    try {
        // Must be member of conversation
        const conv = await db.query(
            `SELECT id FROM conversations
       WHERE id = $1 AND (owner_id = $2 OR renter_id = $2)`,
            [conversationId, userId]
        );

        if (conv.rows.length === 0) {
            return res.status(403).json({ message: "Not allowed" });
        }

        const msgs = await db.query(
            `SELECT m.*, u.name AS sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
            [conversationId]
        );

        return res.json(msgs.rows);
    } catch (err) {
        console.error("get messages error:", err.message);
        return res.status(500).json({ message: "Server error" });
    }
});

// ✅ POST send message
router.post("/messages/:conversationId", authMiddleware, async (req, res) => {
    const db = req.app.get("db");
    const io = req.app.get("io"); // ✅ get socket.io instance here (no import!)
    const { conversationId } = req.params;
    const userId = req.userId;
    const { body } = req.body;

    if (!body || !String(body).trim()) {
        return res.status(400).json({ message: "Message is empty" });
    }

    try {
        // Must be member of conversation
        const conv = await db.query(
            `SELECT id FROM conversations
       WHERE id = $1 AND (owner_id = $2 OR renter_id = $2)`,
            [conversationId, userId]
        );

        if (conv.rows.length === 0) {
            return res.status(403).json({ message: "Not allowed" });
        }

        const inserted = await db.query(
            `INSERT INTO messages (conversation_id, sender_id, body)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [conversationId, userId, body.trim()]
        );

        const msg = inserted.rows[0];

        // ✅ Emit real-time event
        io.to(`conv:${conversationId}`).emit("newMessage", msg);

        return res.json(msg);
    } catch (err) {
        console.error("send message error:", err.message);
        return res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
