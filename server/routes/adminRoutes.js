const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");

// ============================
// AUTH + ADMIN MIDDLEWARE
// ============================
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

        if (!decoded.userId) return res.status(401).json({ message: "Invalid token payload" });

        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid/expired token" });
    }
};

const requireAdmin = async (req, res, next) => {
    try {
        const db = req.app.get("db");
        const result = await db.query("SELECT role FROM users WHERE id = $1", [req.userId]);
        const user = result.rows[0];

        if (!user) return res.status(401).json({ message: "User not found" });
        if (user.role !== "admin") return res.status(403).json({ message: "Admin only" });

        next();
    } catch (err) {
        return res.status(500).json({ message: "Server error" });
    }
};

// ============================
// TOOLS (you likely already have)
// ============================
router.get("/tools/pending", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const db = req.app.get("db");
        const result = await db.query(
            `
      SELECT t.*, u.name AS owner_name
      FROM tools t
      JOIN users u ON u.id = t.owner_id
      WHERE LOWER(t.approval_status) = 'pending'
      ORDER BY t.created_at DESC
      `
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

router.patch("/tools/:id/approve", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const db = req.app.get("db");
        const { id } = req.params;

        const result = await db.query(
            `
      UPDATE tools
      SET approval_status = 'approved',
          approved_at = NOW(),
          approved_by = $2,
          rejection_reason = NULL
      WHERE id = $1
      RETURNING *
      `,
            [id, req.userId]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: "Tool not found" });
        res.json({ message: "Tool approved", tool: result.rows[0] });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

router.patch("/tools/:id/reject", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const db = req.app.get("db");
        const { id } = req.params;
        const { reason } = req.body;

        const result = await db.query(
            `
      UPDATE tools
      SET approval_status = 'rejected',
          approved_at = NULL,
          approved_by = NULL,
          rejection_reason = $2
      WHERE id = $1
      RETURNING *
      `,
            [id, reason || "Rejected by admin"]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: "Tool not found" });
        res.json({ message: "Tool rejected", tool: result.rows[0] });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// ============================
// ✅ USERS (MISSING PART)
// ============================

// GET pending users (example rule: show users whose role is not admin)
router.get("/users/pending", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const db = req.app.get("db");

        // If you have user approval fields, use them here.
        // Since your users table DOES NOT have approval_status columns,
        // we return non-admin users as "pending list" OR you can remove this section.
        const result = await db.query(
            `
      SELECT id, name, email, role
      FROM users
      WHERE role != 'admin'
      ORDER BY created_at DESC
      `
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// Approve user (for now: just keep role as user, nothing to change)
router.patch("/users/:id/approve", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const db = req.app.get("db");
        const { id } = req.params;

        // If you want real approval logic, add columns in users table first.
        const result = await db.query(
            `SELECT id, name, email, role FROM users WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
        res.json({ message: "User approved (no DB change)", user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// Reject user (example: delete user)
router.patch("/users/:id/reject", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const db = req.app.get("db");
        const { id } = req.params;

        // ⚠️ This deletes the user. If you don't want delete, tell me.
        await db.query(`DELETE FROM users WHERE id = $1 AND role != 'admin'`, [id]);

        res.json({ message: "User rejected (deleted)" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;