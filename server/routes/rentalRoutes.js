const express = require("express");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../utils/email");

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
        if (!req.userId) return res.status(401).json({ message: "Invalid token payload" });

        next();
    } catch (e) {
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
        const { toolId, startDate, endDate } = req.body || {};

        if (!toolId || !startDate || !endDate) {
            return res.status(400).json({ message: "Missing fields" });
        }

        const toolRes = await db.query(`SELECT * FROM tools WHERE id = $1`, [toolId]);
        const tool = toolRes.rows[0];

        if (!tool) return res.status(404).json({ message: "Tool not found" });
        if (!tool.available) return res.status(400).json({ message: "Tool not available" });

        if (String(tool.owner_id) === String(req.userId)) {
            return res.status(400).json({ message: "You cannot rent your own tool" });
        }

        const created = await db.query(
            `INSERT INTO rentals (tool_id, renter_id, owner_id, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
            [toolId, req.userId, tool.owner_id, startDate, endDate]
        );

        // ✅ Email notifications (REQUEST CREATED)
        try {
            const info = await db.query(
                `
        SELECT 
          r.id AS rental_id,
          r.start_date, r.end_date, r.status,
          t.name AS tool_name,
          u_renter.email AS renter_email,
          u_renter.name AS renter_name,
          u_owner.email AS owner_email,
          u_owner.name AS owner_name
        FROM rentals r
        JOIN tools t ON t.id = r.tool_id
        JOIN users u_renter ON u_renter.id = r.renter_id
        JOIN users u_owner ON u_owner.id = t.owner_id
        WHERE r.id = $1
        `,
                [created.rows[0].id]
            );

            if (info.rows.length) {
                const x = info.rows[0];

                await sendEmail({
                    to: x.renter_email,
                    subject: `Rental Request Sent: ${x.tool_name}`,
                    text: `Hi ${x.renter_name}, your rental request for "${x.tool_name}" has been sent.`,
                    html: `
            <h2>Rental Request Sent</h2>
            <p>Hi <b>${x.renter_name}</b>,</p>
            <p>Your request for <b>${x.tool_name}</b> has been sent to <b>${x.owner_name}</b>.</p>
            <p><b>Dates:</b> ${x.start_date} to ${x.end_date}</p>
          `,
                });

                await sendEmail({
                    to: x.owner_email,
                    subject: `New Rental Request: ${x.tool_name}`,
                    text: `Hi ${x.owner_name}, you received a new rental request for "${x.tool_name}".`,
                    html: `
            <h2>New Rental Request</h2>
            <p>Hi <b>${x.owner_name}</b>,</p>
            <p>You received a new rental request for <b>${x.tool_name}</b> from <b>${x.renter_name}</b>.</p>
            <p><b>Dates:</b> ${x.start_date} to ${x.end_date}</p>
            <p>Please login to approve or reject the request.</p>
          `,
                });
            }
        } catch (e) {
            console.error("Rental request email failed:", e.message);
        }

        res.status(201).json(created.rows[0]);
    } catch (err) {
        console.error("Rental request error:", err);
        res.status(500).json({ message: err.message || "Failed to request rental" });
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
        r.owner_id,
        r.start_date,
        r.end_date,
        r.status,
        r.is_paid,
        r.paid_at,
        r.stripe_payment_intent_id,
        r.returned_at,
        r.completed_at,

        t.name AS tool_name,
        t.price_per_day,
        t.image_url AS tool_image_url,
        t.owner_id AS tool_owner_id,

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
        res.status(500).json({ message: err.message || "Failed to load requests" });
    }
});

/* =========================
   ✅ RENTER: GET MY RENTALS
   GET /api/rentals/my
   (NOW RETURNS PAYMENT FIELDS)
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
        r.owner_id,
        r.start_date,
        r.end_date,
        r.status,
        r.is_paid,
        r.paid_at,
        r.stripe_payment_intent_id,
        r.returned_at,
        r.completed_at,

        t.name AS tool_name,
        t.price_per_day,
        t.image_url AS tool_image_url,
        t.owner_id AS tool_owner_id,

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
        res.status(500).json({ message: err.message || "Failed to load your rentals" });
    }
});

/* =========================
   ✅ Tools History (Rental History)
   GET /api/rentals/history
========================= */
router.get("/history", auth, async (req, res) => {
    try {
        const db = req.app.get("db");

        const result = await db.query(
            `
      SELECT
        r.id,
        r.tool_id,
        r.renter_id,
        r.owner_id,
        r.start_date,
        r.end_date,
        r.status,
        r.is_paid,
        r.paid_at,
        r.stripe_payment_intent_id,
        r.created_at,
        r.returned_at,
        r.completed_at,

        t.name AS tool_name,
        t.price_per_day,
        t.image_url AS tool_image_url,

        renter.name AS renter_name,
        renter.email AS renter_email,

        owner.name AS owner_name,
        owner.email AS owner_email
      FROM rentals r
      JOIN tools t ON t.id = r.tool_id
      JOIN users renter ON renter.id = r.renter_id
      JOIN users owner ON owner.id = r.owner_id
      WHERE (r.renter_id = $1 OR r.owner_id = $1)
        AND LOWER(r.status) <> 'pending'
      ORDER BY r.created_at DESC
      `,
            [req.userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Get history error:", err);
        res.status(500).json({ message: err.message || "Failed to load history" });
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

        const check = await db.query(
            `
      SELECT r.*, t.owner_id, t.name AS tool_name
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

        await db.query(`UPDATE tools SET available=false WHERE id=$1`, [rental.tool_id]);

        // ✅ Email notifications (APPROVED)
        try {
            const info = await db.query(
                `
        SELECT 
          r.id AS rental_id,
          r.start_date, r.end_date, r.status,
          t.name AS tool_name,
          u_renter.email AS renter_email,
          u_renter.name AS renter_name,
          u_owner.email AS owner_email,
          u_owner.name AS owner_name
        FROM rentals r
        JOIN tools t ON t.id = r.tool_id
        JOIN users u_renter ON u_renter.id = r.renter_id
        JOIN users u_owner ON u_owner.id = t.owner_id
        WHERE r.id = $1
        `,
                [id]
            );

            if (info.rows.length) {
                const x = info.rows[0];

                await sendEmail({
                    to: x.renter_email,
                    subject: `✅ Rental Approved: ${x.tool_name}`,
                    text: `Hi ${x.renter_name}, your rental request for "${x.tool_name}" has been approved.`,
                    html: `
            <h2>✅ Rental Approved</h2>
            <p>Hi <b>${x.renter_name}</b>,</p>
            <p>Your rental request for <b>${x.tool_name}</b> has been approved by <b>${x.owner_name}</b>.</p>
            <p><b>Dates:</b> ${x.start_date} to ${x.end_date}</p>
          `,
                });

                await sendEmail({
                    to: x.owner_email,
                    subject: `You approved a rental: ${x.tool_name}`,
                    text: `You approved the rental request for "${x.tool_name}".`,
                    html: `
            <h2>Rental Approved</h2>
            <p>Hi <b>${x.owner_name}</b>,</p>
            <p>You approved the rental request for <b>${x.tool_name}</b>.</p>
            <p><b>Renter:</b> ${x.renter_name} (${x.renter_email})</p>
            <p><b>Dates:</b> ${x.start_date} to ${x.end_date}</p>
          `,
                });
            }
        } catch (e) {
            console.error("Approval email failed:", e.message);
        }

        res.json(updated.rows[0]);
    } catch (err) {
        console.error("Approve error:", err);
        res.status(500).json({ message: err.message || "Failed to approve request" });
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
      SELECT r.*, t.owner_id, t.name AS tool_name
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

        // ✅ Email notifications (REJECTED)
        try {
            const info = await db.query(
                `
        SELECT 
          r.id AS rental_id,
          r.start_date, r.end_date, r.status,
          t.name AS tool_name,
          u_renter.email AS renter_email,
          u_renter.name AS renter_name,
          u_owner.email AS owner_email,
          u_owner.name AS owner_name
        FROM rentals r
        JOIN tools t ON t.id = r.tool_id
        JOIN users u_renter ON u_renter.id = r.renter_id
        JOIN users u_owner ON u_owner.id = t.owner_id
        WHERE r.id = $1
        `,
                [id]
            );

            if (info.rows.length) {
                const x = info.rows[0];

                await sendEmail({
                    to: x.renter_email,
                    subject: `❌ Rental Rejected: ${x.tool_name}`,
                    text: `Hi ${x.renter_name}, your rental request for "${x.tool_name}" has been rejected.`,
                    html: `
            <h2>❌ Rental Rejected</h2>
            <p>Hi <b>${x.renter_name}</b>,</p>
            <p>Your rental request for <b>${x.tool_name}</b> was rejected by <b>${x.owner_name}</b>.</p>
            <p><b>Requested dates:</b> ${x.start_date} to ${x.end_date}</p>
          `,
                });

                await sendEmail({
                    to: x.owner_email,
                    subject: `You rejected a rental: ${x.tool_name}`,
                    text: `You rejected the rental request for "${x.tool_name}".`,
                    html: `
            <h2>Rental Rejected</h2>
            <p>Hi <b>${x.owner_name}</b>,</p>
            <p>You rejected the rental request for <b>${x.tool_name}</b>.</p>
          `,
                });
            }
        } catch (e) {
            console.error("Rejection email failed:", e.message);
        }

        res.json(updated.rows[0]);
    } catch (err) {
        console.error("Reject error:", err);
        res.status(500).json({ message: err.message || "Failed to reject request" });
    }
});

/* =========================
   RENTER: MARK RETURNED
   PATCH /api/rentals/:id/return
   ✅ must be PAID + APPROVED
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

        if (String(rental.status || "").toLowerCase() !== "approved") {
            return res.status(400).json({ message: "Only approved rentals can be returned" });
        }

        if (!rental.is_paid) {
            return res.status(400).json({ message: "Please pay first before marking returned" });
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
        res.status(500).json({ message: err.message || "Failed to mark returned" });
    }
});

/* =========================
   OWNER: CONFIRM RETURNED
   PATCH /api/rentals/:id/confirm-return
========================= */
router.patch("/:id/confirm-return", auth, async (req, res) => {
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
        if (!rental) return res.status(404).json({ message: "Rental not found" });

        if (String(rental.owner_id) !== String(req.userId)) {
            return res.status(403).json({ message: "Not allowed" });
        }

        if (String(rental.status || "").toLowerCase() !== "returned_pending") {
            return res.status(400).json({ message: "Rental is not waiting for confirmation" });
        }

        const updated = await db.query(
            `UPDATE rentals
       SET status='completed', completed_at=NOW()
       WHERE id=$1
       RETURNING *`,
            [id]
        );

        await db.query(`UPDATE tools SET available=true WHERE id=$1`, [rental.tool_id]);

        res.json(updated.rows[0]);
    } catch (err) {
        console.error("Confirm return error:", err);
        res.status(500).json({ message: err.message || "Failed to confirm return" });
    }
});

module.exports = router;