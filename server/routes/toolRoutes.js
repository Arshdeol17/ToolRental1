const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// =========================
// Multer storage (uploads/)
// =========================
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || "";
        const base = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, base + ext);
    },
});

const upload = multer({ storage });

// =========================
// AUTH MIDDLEWARE
// - sets req.userId
// =========================
const requireAuth = (req, res, next) => {
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

        // IMPORTANT: your token payload uses { userId: ... }
        req.userId = decoded.userId;
        if (!req.userId) return res.status(401).json({ message: "Invalid token payload" });

        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid/expired token" });
    }
};

/* =========================
   ADD TOOL (WITH IMAGE)
router.post("/", auth, upload.single("image"), async (req, res) => {
    try {
        const db = req.app.get("db");

        const { name, description, category, condition, price, latitude, longitude, address } = req.body;
        if (!name || !price) {
            return res.status(400).json({ message: "Name and price are required" });
        }

        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const result = await db.query(
            `
            INSERT INTO tools
            (name, description, category, condition, price_per_day, image_url, owner_id, available, latitude, longitude, address)
            VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10)
            RETURNING * `,
            [name, description, category, condition, price, imageUrl, req.userId, latitude, longitude, address]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Add tool error:", err);
        res.status(500).json({ message: "Failed to add tool" });
// =========================
// Helper middleware:
// If request is multipart/form-data, run multer.single('image')
// otherwise skip
// =========================
const multipartHandler = (req, res, next) => {
    const ctype = (req.headers["content-type"] || "").toLowerCase();
    if (ctype.startsWith("multipart/form-data")) {
        return upload.single("image")(req, res, next);
    }
    next();
};

/* ======================================================
   PUBLIC GET ALL TOOLS (ONLY APPROVED)
   GET /api/tools
====================================================== */
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
      WHERE LOWER(t.approval_status) = 'approved'
      GROUP BY t.id, u.name
      ORDER BY t.created_at DESC
    `);

        res.json(result.rows);
    } catch (err) {
        console.error("GET /api/tools error:", err);
        res.status(500).json({ message: err.message || "Server error" });
    }
});

/* ======================================================
   GET SINGLE TOOL BY ID (ONLY APPROVED)
   GET /api/tools/:id
====================================================== */
router.get("/:id", async (req, res) => {
    try {
        const db = req.app.get("db");
        const { id } = req.params;

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
      WHERE t.id = $1
        AND LOWER(t.approval_status) = 'approved'
      GROUP BY t.id, u.name
      `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Tool not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("GET /api/tools/:id error:", err);
        res.status(500).json({ message: err.message || "Server error" });
    }
});
/* =========================
   FILTER TOOLS BY LOCATION
   GET /filter-by-location?lat=xxx&lng=xxx&radius=xxx
========================= */
router.get("/filter-by-location", async (req, res) => {
    try {
        const db = req.app.get("db");
        const { lat, lng, radius } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ message: "Latitude and longitude required" });
        }

        const radiusKm = radius || 50; // Default 50km radius

        // Haversine formula to calculate distance
        const result = await db.query(
            `
            SELECT t.*, u.name AS owner_name,
                   (6371 * acos(
                       cos(radians($1)) * cos(radians(latitude)) *
                       cos(radians(longitude) - radians($2)) +
                       sin(radians($1)) * sin(radians(latitude))
                   )) AS distance
            FROM tools t
            JOIN users u ON t.owner_id = u.id
            WHERE latitude IS NOT NULL 
              AND longitude IS NOT NULL
            HAVING distance <= $3
            ORDER BY distance ASC
            `,
            [lat, lng, radiusKm]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Location filter error:", err);
        res.status(500).json({ error: err.message });
    }
});

/* ======================================================
   CREATE TOOL (DEFAULT PENDING)
   POST /api/tools
   Accepts either JSON or multipart/form-data (with file field "image")
====================================================== */
router.post("/", requireAuth, multipartHandler, async (req, res) => {
    try {
        const db = req.app.get("db");

        const {
            name,
            description = "",
            category,
            condition,
            price, // front may send `price` or `price_per_day`
            price_per_day,
            imageUrl = "",
        } = req.body || {};

        const priceValue = price_per_day ?? price;

        if (!name || !category || !condition || priceValue === undefined || priceValue === "") {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // If a file was uploaded, construct image URL (served from /uploads)
        let finalImageUrl = imageUrl || "";
        if (req.file) {
            finalImageUrl = `/uploads/${req.file.filename}`;
        }

        const result = await db.query(
            `
      INSERT INTO tools
      (name, description, category, condition, price_per_day, image_url, owner_id, available, approval_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'pending')
      RETURNING *
      `,
            [name, description, category, condition, priceValue, finalImageUrl, req.userId]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("POST /api/tools error:", err);
        res.status(500).json({ message: err.message || "Server error" });
    }
});

module.exports = router;