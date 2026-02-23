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
   REQUEST RENTAL
   POST /api/rentals/request
========================= */
router.post("/request", auth, async (req, res) => {
    try {
        const db = req.app.get("db");
        const { toolId, startDate, endDate } = req.body;

        if (!toolId || !startDate || !endDate) {
            return res.status(400).json({ message: "Missing fields" });
        }

        // Tool must exist and be available
        const toolRes = await db.query(`SELECT * FROM tools WHERE id = $1`, [toolId]);
        const tool = toolRes.rows[0];
        if (!tool) return res.status(404).json({ message: "Tool not found" });
        if (!tool.available) return res.status(400).json({ message: "Tool not available" });

        // Prevent renting own tool
        if (String(tool.owner_id) === String(req.userId)) {
            return res.status(400).json({ message: "You cannot rent your own tool" });
        }

        const created = await db.query(
            `INSERT INTO rentals (tool_id, renter_id, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
            [toolId, req.userId, startDate, endDate]
        );

        res.status(201).json(created.rows[0]);
    } catch (err) {
        console.error("Rental request error:", err);
        res.status(500).json({ message: "Failed to request rental" });
    }
});

/* =========================
   OWNER: GET REQUESTS FOR MY TOOLS
   GET /api/rentals/requests
========================= */
router.get("/requests", auth, async (req, res) => {
    try {
        const db = req.app.get("db");

        const result = await db.query(
            `
      SELECT 
        r.id,
        r.tool_id,
        r.renter_id,
        r.start_date,
        r.end_date,
        r.status,
        r.returned_at,
        r.completed_at,

        t.name AS tool_name,
        t.price_per_day,
        t.image_url AS tool_image_url,
        t.owner_id,

        u.name AS renter_name,
        u.email AS renter_email
      FROM rentals r
      JOIN tools t ON r.tool_id = t.id
      JOIN users u ON r.renter_id = u.id
      WHERE t.owner_id = $1
      ORDER BY r.id DESC
      `,
            [req.userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Get owner requests error:", err);
        res.status(500).json({ message: "Failed to load requests" });
    }
});

/* =========================
   RENTER: GET MY RENTALS
   GET /api/rentals/my
========================= */
router.get("/my", auth, async (req, res) => {
    try {
        const db = req.app.get("db");

        const result = await db.query(
            `
      SELECT
        r.id,
        r.tool_id,
        r.renter_id,
        r.start_date,
        r.end_date,
        r.status,
        r.returned_at,
        r.completed_at,

        t.name AS tool_name,
        t.price_per_day,
        t.image_url AS tool_image_url,
        t.owner_id,

        o.name AS owner_name,
        o.email AS owner_email
      FROM rentals r
      JOIN tools t ON r.tool_id = t.id
      JOIN users o ON t.owner_id = o.id
      WHERE r.renter_id = $1
      ORDER BY r.id DESC
      `,
            [req.userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Get my rentals error:", err);
        res.status(500).json({ message: "Failed to load your rentals" });
    }
});

/* =========================
   OWNER: APPROVE
   PATCH /api/rentals/:id/approve
========================= */
router.patch("/:id/approve", auth, async (req, res) => {
    try {
        const db = req.app.get("db");
        const { id } = req.params;

        // ensure owner owns the tool
        const check = await db.query(
            `
      SELECT r.*, t.owner_id
      FROM rentals r
      JOIN tools t ON r.tool_id = t.id
      WHERE r.id = $1
      `,
            [id]
        );

        const rental = check.rows[0];
        if (!rental) return res.status(404).json({ message: "Request not found" });
        if (String(rental.owner_id) !== String(req.userId)) {
            return res.status(403).json({ message: "Not allowed" });
        }

        const updated = await db.query(
            `UPDATE rentals SET status='approved' WHERE id=$1 RETURNING *`,
            [id]
        );

        // optional: mark tool unavailable when approved
        await db.query(`UPDATE tools SET available=false WHERE id=$1`, [rental.tool_id]);

        res.json(updated.rows[0]);
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
        const { id } = req.params;

        const check = await db.query(
            `
      SELECT r.*, t.owner_id
      FROM rentals r
      JOIN tools t ON r.tool_id = t.id
      WHERE r.id = $1
      `,
            [id]
        );

        const rental = check.rows[0];
        if (!rental) return res.status(404).json({ message: "Request not found" });
        if (String(rental.owner_id) !== String(req.userId)) {
            return res.status(403).json({ message: "Not allowed" });
        }

        const updated = await db.query(
            `UPDATE rentals SET status='rejected' WHERE id=$1 RETURNING *`,
            [id]
        );

        res.json(updated.rows[0]);
    } catch (err) {
        console.error("Reject error:", err);
        res.status(500).json({ message: "Failed to reject request" });
    }
});

/* =========================
   RENTER: MARK RETURNED
   PATCH /api/rentals/:id/return
   approved -> returned_pending
========================= */
router.patch("/:id/return", auth, async (req, res) => {
    try {
        const db = req.app.get("db");
        const { id } = req.params;

        const { rows } = await db.query(`SELECT * FROM rentals WHERE id=$1`, [id]);
        const rental = rows[0];
        if (!rental) return res.status(404).json({ message: "Rental not found" });

        if (String(rental.renter_id) !== String(req.userId)) {
            return res.status(403).json({ message: "Not allowed" });
        }

        if (String(rental.status).toLowerCase() !== "approved") {
            return res.status(400).json({ message: "Only approved rentals can be returned" });
        }

        const updated = await db.query(
            `UPDATE rentals
       SET status='returned_pending', returned_at=NOW()
       WHERE id=$1
       RETURNING *`,
            [id]
        );

        res.json(updated.rows[0]);
    } catch (err) {
        console.error("Return error:", err);
        res.status(500).json({ message: "Failed to mark returned" });
    }
});

/* =========================
   OWNER: CONFIRM RETURNED
   PATCH /api/rentals/:id/confirm-return
   returned_pending -> completed
========================= */
router.patch("/:id/confirm-return", auth, async (req, res) => {
    try {
        const db = req.app.get("db");
        const { id } = req.params;

        // load rental + tool to validate owner
        const check = await db.query(
            `
      SELECT r.*, t.owner_id, t.id as tool_real_id
      FROM rentals r
      JOIN tools t ON r.tool_id = t.id
      WHERE r.id = $1
      `,
            [id]
        );

        const rental = check.rows[0];
        if (!rental) return res.status(404).json({ message: "Rental not found" });

        if (String(rental.owner_id) !== String(req.userId)) {
            return res.status(403).json({ message: "Not allowed" });
        }

        if (String(rental.status).toLowerCase() !== "returned_pending") {
            return res.status(400).json({ message: "Rental is not waiting for confirmation" });
        }

        const updated = await db.query(
            `UPDATE rentals
       SET status='completed', completed_at=NOW()
       WHERE id=$1
       RETURNING *`,
            [id]
        );

        // tool becomes available again
        await db.query(`UPDATE tools SET available=true WHERE id=$1`, [rental.tool_id]);

        res.json(updated.rows[0]);
    } catch (err) {
        console.error("Confirm return error:", err);
        res.status(500).json({ message: "Failed to confirm return" });
    }
});

module.exports = router;
