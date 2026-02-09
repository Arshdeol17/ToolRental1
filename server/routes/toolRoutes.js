const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

const router = express.Router();

/* =========================
   MULTER CONFIG
========================= */
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueName + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Only image files allowed"));
    },
});

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
   ADD TOOL (WITH IMAGE)
   POST /api/tools
========================= */
router.post("/", auth, upload.single("image"), async (req, res) => {
    try {
        const db = req.app.get("db");

        const { name, description, category, condition, price } = req.body;
        if (!name || !price) {
            return res.status(400).json({ message: "Name and price are required" });
        }

        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const result = await db.query(
            `
      INSERT INTO tools
      (name, description, category, condition, price_per_day, image_url, owner_id, available)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING *
      `,
            [name, description, category, condition, price, imageUrl, req.userId]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Add tool error:", err);
        res.status(500).json({ message: "Failed to add tool" });
    }
});

/* =========================
   ✅ GET ALL TOOLS + RATINGS
   GET /api/tools
   returns avg_rating + review_count
========================= */
router.get("/", async (req, res) => {
    try {
        const db = req.app.get("db");

        const result = await db.query(`
      SELECT 
        t.*, 
        u.name AS owner_name,
        COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating,
        COUNT(r.id) AS review_count
      FROM tools t
      JOIN users u ON t.owner_id = u.id
      LEFT JOIN tool_reviews r ON r.tool_id = t.id
      GROUP BY t.id, u.name
      ORDER BY t.created_at DESC
    `);

        res.json(result.rows);
    } catch (err) {
        console.error("Get tools error:", err);
        res.status(500).json({ error: err.message });
    }
});

/* =========================
   GET MY TOOLS
   GET /api/tools/my
   (optional: also returns rating stats)
========================= */
router.get("/my", auth, async (req, res) => {
    try {
        const db = req.app.get("db");

        const result = await db.query(
            `
      SELECT 
        t.*, 
        u.name AS owner_name,
        COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating,
        COUNT(r.id) AS review_count
      FROM tools t
      JOIN users u ON t.owner_id = u.id
      LEFT JOIN tool_reviews r ON r.tool_id = t.id
      WHERE t.owner_id = $1
      GROUP BY t.id, u.name
      ORDER BY t.created_at DESC
      `,
            [req.userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Get my tools error:", err);
        res.status(500).json({ error: err.message });
    }
});

/* =========================
   ✅ GET SINGLE TOOL BY ID + RATINGS
   GET /api/tools/:id
========================= */
router.get("/:id", async (req, res) => {
    try {
        const db = req.app.get("db");
        const { id } = req.params;

        const result = await db.query(
            `
      SELECT 
        t.*, 
        u.name AS owner_name, 
        u.email AS owner_email,
        COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating,
        COUNT(r.id) AS review_count
      FROM tools t
      JOIN users u ON t.owner_id = u.id
      LEFT JOIN tool_reviews r ON r.tool_id = t.id
      WHERE t.id = $1
      GROUP BY t.id, u.name, u.email
      `,
            [id]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ message: "Tool not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Get tool error:", err);
        res.status(500).json({ error: err.message });
    }
});

/* =========================
   ✅ UPDATE AVAILABILITY ONLY
   PATCH /api/tools/:id/availability
   owner only
========================= */
router.patch("/:id/availability", auth, async (req, res) => {
    try {
        const db = req.app.get("db");
        const { id } = req.params;
        const { available } = req.body;

        if (typeof available !== "boolean") {
            return res.status(400).json({ message: "available must be boolean true/false" });
        }

        const existing = await db.query(`SELECT * FROM tools WHERE id = $1`, [id]);
        const tool = existing.rows[0];

        if (!tool) return res.status(404).json({ message: "Tool not found" });

        if (String(tool.owner_id) !== String(req.userId)) {
            return res.status(403).json({ message: "Not allowed" });
        }

        const updated = await db.query(
            `UPDATE tools SET available = $1 WHERE id = $2 RETURNING *`,
            [available, id]
        );

        res.json(updated.rows[0]);
    } catch (err) {
        console.error("Availability update error:", err);
        res.status(500).json({ message: "Failed to update availability" });
    }
});

/* =========================
   UPDATE TOOL (WITH OPTIONAL IMAGE)
   PUT /api/tools/:id
   owner only
========================= */
router.put("/:id", auth, upload.single("image"), async (req, res) => {
    try {
        const db = req.app.get("db");
        const { id } = req.params;

        const existing = await db.query(`SELECT * FROM tools WHERE id = $1`, [id]);
        const tool = existing.rows[0];

        if (!tool) return res.status(404).json({ message: "Tool not found" });

        if (String(tool.owner_id) !== String(req.userId)) {
            return res.status(403).json({ message: "Not allowed" });
        }

        const { name, description, category, condition, price } = req.body;

        let imageUrl = tool.image_url;

        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;

            if (tool.image_url) {
                const oldPath = path.join(process.cwd(), tool.image_url.replace("/", ""));
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        }

        const updated = await db.query(
            `
      UPDATE tools
      SET name = $1,
          description = $2,
          category = $3,
          condition = $4,
          price_per_day = $5,
          image_url = $6
      WHERE id = $7
      RETURNING *
      `,
            [
                name ?? tool.name,
                description ?? tool.description,
                category ?? tool.category,
                condition ?? tool.condition,
                price ?? tool.price_per_day,
                imageUrl,
                id,
            ]
        );

        res.json(updated.rows[0]);
    } catch (err) {
        console.error("Update tool error:", err);
        res.status(500).json({ message: "Failed to update tool" });
    }
});

/* =========================
   DELETE TOOL
   DELETE /api/tools/:id
   owner only
========================= */
router.delete("/:id", auth, async (req, res) => {
    try {
        const db = req.app.get("db");
        const { id } = req.params;

        const existing = await db.query(`SELECT * FROM tools WHERE id = $1`, [id]);
        const tool = existing.rows[0];

        if (!tool) return res.status(404).json({ message: "Tool not found" });

        if (String(tool.owner_id) !== String(req.userId)) {
            return res.status(403).json({ message: "Not allowed" });
        }

        if (tool.image_url) {
            const imgPath = path.join(process.cwd(), tool.image_url.replace("/", ""));
            if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }

        await db.query(`DELETE FROM tools WHERE id = $1`, [id]);

        res.json({ message: "Tool deleted" });
    } catch (err) {
        console.error("Delete tool error:", err);
        res.status(500).json({ message: "Failed to delete tool" });
    }
});

module.exports = router;
