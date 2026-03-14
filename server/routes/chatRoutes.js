const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

/* =====================================================
   AUTH MIDDLEWARE (matches your server.js JWT)
   jwt.sign({ userId: user.id }, ...)
===================================================== */
const authMiddleware = (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = header.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "toolrental-super-secret-2026"
        );

        if (!decoded.userId) {
            return res.status(401).json({ message: "Invalid token payload" });
        }

        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid/expired token" });
    }
};

/* =====================================================
   1️⃣ Get or Create Conversation for Rental
   GET /api/chat/conversation/:rentalId
===================================================== */
router.get("/conversation/:rentalId", authMiddleware, async (req, res) => {
    try {
        const db = req.app.get("db");
        const { rentalId } = req.params;
        const userId = req.userId;

        // Check rental exists & user belongs to it
        const rentalCheck = await db.query(
            `
      SELECT * FROM rentals
      WHERE id = $1
      AND (owner_id = $2 OR renter_id = $2)
      `,
            [rentalId, userId]
        );

        if (rentalCheck.rows.length === 0) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const rental = rentalCheck.rows[0];

        // Check if conversation already exists
        const existing = await db.query(
            `SELECT * FROM conversations WHERE rental_id = $1`,
            [rentalId]
        );

        if (existing.rows.length > 0) {
            return res.json(existing.rows[0]);
        }

        // Create new conversation
        const newConversation = await db.query(
            `
      INSERT INTO conversations (rental_id, owner_id, renter_id)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
            [rentalId, rental.owner_id, rental.renter_id]
        );

        res.json(newConversation.rows[0]);
    } catch (err) {
        console.error("Conversation error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

/* =====================================================
   2️⃣ Get Messages in Conversation
   GET /api/chat/messages/:conversationId
===================================================== */
router.get("/messages/:conversationId", authMiddleware, async (req, res) => {
    try {
        const db = req.app.get("db");
        const { conversationId } = req.params;
        const userId = req.userId;

        // Ensure user is part of conversation
        const check = await db.query(
            `
      SELECT id FROM conversations
      WHERE id = $1
      AND (owner_id = $2 OR renter_id = $2)
      `,
            [conversationId, userId]
        );

        if (check.rows.length === 0) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const messages = await db.query(
            `
      SELECT m.*, u.name AS sender_name
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
      `,
            [conversationId]
        );

        res.json(messages.rows);
    } catch (err) {
        console.error("Get messages error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

/* =====================================================
   3️⃣ Send Message
   POST /api/chat/messages
===================================================== */
router.post("/messages", authMiddleware, async (req, res) => {
    try {
        const db = req.app.get("db");
        const io = req.app.get("io");

        const { conversationId, body } = req.body;
        const userId = req.userId;

        if (!conversationId || !body) {
            return res.status(400).json({ message: "Missing fields" });
        }

        // Ensure user belongs to conversation
        const check = await db.query(
            `
      SELECT id FROM conversations
      WHERE id = $1
      AND (owner_id = $2 OR renter_id = $2)
      `,
            [conversationId, userId]
        );

        if (check.rows.length === 0) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const result = await db.query(
            `
      INSERT INTO messages (conversation_id, sender_id, body)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
            [conversationId, userId, body]
        );

        const message = result.rows[0];

        // Emit via socket to room
        if (io) {
            io.to(`conv:${conversationId}`).emit("newMessage", message);
        }

        res.status(201).json(message);
    } catch (err) {
        console.error("Send message error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;