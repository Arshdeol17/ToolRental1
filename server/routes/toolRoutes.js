const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const path = require("path");

const router = express.Router();

/* =========================
   MULTER CONFIG
========================= */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
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

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch {
        return res.status(401).json({ message: "Invalid token" });
    }
};

/* =========================
   ADD TOOL (WITH IMAGE)
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
   GET ALL TOOLS
   ✅ DON'T FILTER OUT TOOLS
========================= */
router.get("/", async (req, res) => {
    try {
        const db = req.app.get("db");

        const result = await db.query(`
      SELECT t.*, u.name AS owner_name
      FROM tools t
      JOIN users u ON t.owner_id = u.id
      ORDER BY t.created_at DESC
    `);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* =========================
   GET MY TOOLS
========================= */
router.get("/my", auth, async (req, res) => {
    try {
        const db = req.app.get("db");

        const result = await db.query(
            `
      SELECT t.*, u.name AS owner_name
      FROM tools t
      JOIN users u ON t.owner_id = u.id
      WHERE t.owner_id = $1
      ORDER BY t.created_at DESC
      `,
            [req.userId]
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* =========================
   GET SINGLE TOOL BY ID
   (KEEP THIS BELOW /my)
========================= */
router.get("/:id", async (req, res) => {
    try {
        const db = req.app.get("db");
        const { id } = req.params;

        const result = await db.query(
            `
      SELECT t.*, u.name AS owner_name, u.email AS owner_email
      FROM tools t
      JOIN users u ON t.owner_id = u.id
      WHERE t.id = $1
      `,
            [id]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ message: "Tool not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
