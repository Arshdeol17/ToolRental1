const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

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

/**
 * GET reviews for a tool
 * GET /api/reviews/tool/:toolId
 */
router.get("/tool/:toolId", async (req, res) => {
    try {
        const db = req.app.get("db");
        const { toolId } = req.params;

        const result = await db.query(
            `
      SELECT r.*, u.name AS reviewer_name
      FROM tool_reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.tool_id = $1
      ORDER BY r.created_at DESC
      `,
            [toolId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load reviews" });
    }
});

/**
 * GET average rating + count for a tool
 * GET /api/reviews/tool/:toolId/summary
 */
router.get("/tool/:toolId/summary", async (req, res) => {
    try {
        const db = req.app.get("db");
        const { toolId } = req.params;

        const result = await db.query(
            `
      SELECT 
        COALESCE(AVG(rating), 0) AS avg_rating,
        COUNT(*)::int AS review_count
      FROM tool_reviews
      WHERE tool_id = $1
      `,
            [toolId]
        );

        res.json({
            avg_rating: Number(result.rows[0]?.avg_rating || 0),
            review_count: Number(result.rows[0]?.review_count || 0),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load rating summary" });
    }
});

/**
 * POST create/update review for a tool (upsert)
 * POST /api/reviews/tool/:toolId
 */
router.post("/tool/:toolId", auth, async (req, res) => {
    try {
        const db = req.app.get("db");
        const { toolId } = req.params;
        const { rating, comment } = req.body;

        const r = Number(rating);
        if (!r || r < 1 || r > 5) {
            return res.status(400).json({ message: "Rating must be 1 to 5" });
        }

        // ✅ Only allow review if renter has COMPLETED rental for this tool
        const rentalCheck = await db.query(
            `
      SELECT 1 FROM rentals
      WHERE tool_id = $1
        AND renter_id = $2
        AND LOWER(status) = 'completed'
      LIMIT 1
      `,
            [toolId, req.userId]
        );

        if (rentalCheck.rows.length === 0) {
            return res.status(403).json({
                message:
                    "You can review only after the rental is completed (returned + confirmed).",
            });
        }

        // ✅ Upsert review (insert or update if already reviewed)
        const result = await db.query(
            `
      INSERT INTO tool_reviews (tool_id, reviewer_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (tool_id, reviewer_id)
      DO UPDATE SET 
        rating = EXCLUDED.rating,
        comment = EXCLUDED.comment,
        created_at = NOW()
      RETURNING *
      `,
            [toolId, req.userId, r, comment || null]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to submit review" });
    }
});

module.exports = router;
