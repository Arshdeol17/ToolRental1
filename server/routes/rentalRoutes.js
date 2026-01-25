const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

/* =========================
   AUTH MIDDLEWARE
========================= */
const auth = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "No token provided" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch {
        return res.status(401).json({ message: "Invalid token" });
    }
};

// helper: normalize status
const normStatus = (s) => String(s || "").toLowerCase();

/* =========================
   CREATE RENTAL REQUEST
   POST /api/rentals/request
========================= */
router.post("/request", auth, async (req, res) => {
    try {
        const db = req.app.get("db");
        const { toolId, startDate, endDate } = req.body;

        if (!toolId || !startDate || !endDate) {
            return res
                .status(400)
                .json({ message: "toolId, startDate, endDate required" });
        }

        // Tool exists?
        const toolRes = await db.query(
            `
      SELECT id, owner_id, available, price_per_day, image_url, name
      FROM tools
      WHERE id = $1
      `,
            [toolId]
        );

        const tool = toolRes.rows[0];
        if (!tool) return res.status(404).json({ message: "Tool not found" });
        if (tool.available === false)
            return res.status(400).json({ message: "Tool is not available" });

        // Can't rent your own tool
        if (Number(tool.owner_id) === Number(req.userId)) {
            return res.status(400).json({ message: "You cannot rent your own tool" });
        }

        // Date validation
        const s = new Date(startDate);
        const e = new Date(endDate);
        if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) {
            return res.status(400).json({ message: "Invalid date range" });
        }

        // Prevent overlapping APPROVED rentals for same tool (case-insensitive)
        const overlap = await db.query(
            `
      SELECT 1 FROM rentals
      WHERE tool_id = $1
        AND LOWER(status) = 'approved'
        AND NOT (end_date < $2 OR start_date > $3)
      LIMIT 1
      `,
            [toolId, startDate, endDate]
        );

        if (overlap.rows.length) {
            return res
                .status(400)
                .json({ message: "Tool already rented for these dates" });
        }

        // Create request
        const result = await db.query(
            `
      INSERT INTO rentals (tool_id, renter_id, owner_id, start_date, end_date, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
      `,
            [toolId, req.userId, tool.owner_id, startDate, endDate]
        );

        res.status(201).json({
            message: "Rental request created",
            rental: result.rows[0],
        });
    } catch (err) {
        console.error("Create rental request error:", err);
        res.status(500).json({ message: "Failed to create rental request" });
    }
});

/* =========================
   MY REQUESTS (RENTER)
   GET /api/rentals/my
========================= */
router.get("/my", auth, async (req, res) => {
    try {
        const db = req.app.get("db");

        const result = await db.query(
            `
      SELECT r.*,
             t.name AS tool_name,
             t.image_url AS tool_image_url,
             t.price_per_day,
             u.name AS owner_name,
             u.email AS owner_email
      FROM rentals r
      JOIN tools t ON r.tool_id = t.id
      JOIN users u ON r.owner_id = u.id
      WHERE r.renter_id = $1
      ORDER BY r.created_at DESC
      `,
            [req.userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Get my rentals error:", err);
        res.status(500).json({ message: err.message });
    }
});

/* =========================
   REQUESTS FOR MY TOOLS (OWNER)
   GET /api/rentals/requests
========================= */
router.get("/requests", auth, async (req, res) => {
    try {
        const db = req.app.get("db");

        const result = await db.query(
            `
      SELECT r.*,
             t.name AS tool_name,
             t.image_url AS tool_image_url,
             t.price_per_day,
             u.name AS renter_name,
             u.email AS renter_email
      FROM rentals r
      JOIN tools t ON r.tool_id = t.id
      JOIN users u ON r.renter_id = u.id
      WHERE r.owner_id = $1
      ORDER BY r.created_at DESC
      `,
            [req.userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Get owner requests error:", err);
        res.status(500).json({ message: err.message });
    }
});

/* =========================
   OWNER: APPROVE
   PATCH /api/rentals/:id/approve
========================= */
router.patch("/:id/approve", auth, async (req, res) => {
    try {
        const db = req.app.get("db");
        const rentalId = req.params.id;

        const existing = await db.query(
            `SELECT * FROM rentals WHERE id = $1 AND owner_id = $2`,
            [rentalId, req.userId]
        );

        const rental = existing.rows[0];
        if (!rental) return res.status(404).json({ message: "Request not found" });
        if (normStatus(rental.status) !== "pending") {
            return res.status(400).json({ message: "Request is not pending" });
        }

        // overlap check again
        const overlap = await db.query(
            `
      SELECT 1 FROM rentals
      WHERE tool_id = $1
        AND LOWER(status) = 'approved'
        AND id <> $2
        AND NOT (end_date < $3 OR start_date > $4)
      LIMIT 1
      `,
            [rental.tool_id, rental.id, rental.start_date, rental.end_date]
        );

        if (overlap.rows.length) {
            return res.status(400).json({ message: "Overlaps another approved rental" });
        }

        // Approve request
        const updated = await db.query(
            `UPDATE rentals SET status = 'approved' WHERE id = $1 RETURNING *`,
            [rentalId]
        );

       

        res.json({ message: "Approved", rental: updated.rows[0] });
    } catch (err) {
        console.error("Approve error:", err);
        res.status(500).json({ message: "Failed to approve request" });
    }
});

/* =========================
   OWNER: REJECT
   PATCH /api/rentals/:id/reject
========================= */
router.patch("/:id/reject", auth, async (req, res) => {
    try {
        const db = req.app.get("db");
        const rentalId = req.params.id;

        const updated = await db.query(
            `
      UPDATE rentals
      SET status = 'rejected'
      WHERE id = $1 AND owner_id = $2 AND LOWER(status) = 'pending'
      RETURNING *
      `,
            [rentalId, req.userId]
        );

        if (!updated.rows[0]) {
            return res.status(404).json({ message: "Request not found or not pending" });
        }

        res.json({ message: "Rejected", rental: updated.rows[0] });
    } catch (err) {
        console.error("Reject error:", err);
        res.status(500).json({ message: "Failed to reject request" });
    }
});

module.exports = router;
