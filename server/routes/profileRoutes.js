const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const router = express.Router();

/* =========================
   AUTH MIDDLEWARE
========================= */
const auth = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "No token provided" });

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "toolrental-super-secret-2026"
        );
        req.userId = decoded.userId;
        next();
    } catch {
        return res.status(401).json({ message: "Invalid token" });
    }
};

/* =========================
   GET USER PROFILE
   GET /api/profile
========================= */
router.get("/", auth, async (req, res) => {
    try {
        const db = req.app.get("db");

        const result = await db.query(
            `SELECT id, name, email, phone, address, created_at 
             FROM users 
             WHERE id = $1`,
            [req.userId]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Get profile error:", err);
        res.status(500).json({ message: "Failed to fetch profile" });
    }
});

/* =========================
   UPDATE USER PROFILE
   PUT /api/profile
========================= */
router.put("/", auth, async (req, res) => {
    try {
        const db = req.app.get("db");
        const { name, email, phone, address, currentPassword, newPassword } = req.body;

        // If updating password, verify current password first
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ 
                    message: "Current password required to set new password" 
                });
            }

            const userResult = await db.query(
                "SELECT password_hash FROM users WHERE id = $1",
                [req.userId]
            );

            const isValid = await bcrypt.compare(
                currentPassword,
                userResult.rows[0].password_hash
            );

            if (!isValid) {
                return res.status(401).json({ message: "Current password is incorrect" });
            }

            const newHash = await bcrypt.hash(newPassword, 12);

            const result = await db.query(
                `UPDATE users 
                 SET name = $1, email = $2, phone = $3, address = $4, password_hash = $5
                 WHERE id = $6
                 RETURNING id, name, email, phone, address`,
                [name, email, phone, address, newHash, req.userId]
            );

            return res.json({
                message: "Profile and password updated successfully",
                user: result.rows[0]
            });
        }

        // Update without password change
        const result = await db.query(
            `UPDATE users 
             SET name = $1, email = $2, phone = $3, address = $4
             WHERE id = $5
             RETURNING id, name, email, phone, address`,
            [name, email, phone, address, req.userId]
        );

        res.json({
            message: "Profile updated successfully",
            user: result.rows[0]
        });
    } catch (err) {
        console.error("Update profile error:", err);
        
        if (err.code === "23505") {
            return res.status(400).json({ message: "Email already exists" });
        }
        
        res.status(500).json({ message: "Failed to update profile" });
    }
});

/* =========================
   DELETE USER PROFILE
   DELETE /api/profile
========================= */
router.delete("/", auth, async (req, res) => {
    try {
        const db = req.app.get("db");
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ 
                message: "Password required to delete account" 
            });
        }

        // Verify password before deletion
        const userResult = await db.query(
            "SELECT password_hash FROM users WHERE id = $1",
            [req.userId]
        );

        if (!userResult.rows[0]) {
            return res.status(404).json({ message: "User not found" });
        }

        const isValid = await bcrypt.compare(
            password,
            userResult.rows[0].password_hash
        );

        if (!isValid) {
            return res.status(401).json({ message: "Incorrect password" });
        }

        // Delete user (CASCADE will delete related tools and rentals)
        await db.query("DELETE FROM users WHERE id = $1", [req.userId]);

        res.json({ message: "Account deleted successfully" });
    } catch (err) {
        console.error("Delete profile error:", err);
        res.status(500).json({ message: "Failed to delete account" });
    }
});

/* =========================
   TEST ENDPOINT (NO AUTH)
========================= */
router.get("/test", (req, res) => {
    res.json({ 
        message: "Profile routes are working!",
        endpoints: {
            viewProfile: "GET /api/profile (requires token)",
            editProfile: "PUT /api/profile (requires token)",
            deleteProfile: "DELETE /api/profile (requires token)"
        }
    });
});

module.exports = router;  // ← This stays at the very bottom

module.exports = router;