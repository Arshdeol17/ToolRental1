const dotenv = require("dotenv");
dotenv.config(); // ✅ MUST be before requiring routes/middleware

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");

const userRoutes = require("./routes/userRoutes");
const toolRoutes = require("./routes/toolRoutes");
const rentalRoutes = require("./routes/rentalRoutes");
const profileRoutes = require("./routes/profileRoutes");
const stripeWebhookRouter = require("./routes/stripeWebhook");
const chatRoutes = require("./routes/chatRoutes");
const reviewRoutes = require("./routes/reviewRoutes"); // ✅ NEW

const app = express();

/* ======================
   CORS
====================== */
app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

/* ======================
   Stripe Webhook (RAW)
   ⚠️ Keep BEFORE express.json()
====================== */
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

/* ======================
   JSON + STATIC
====================== */
app.use(express.json());
app.use("/uploads", express.static("uploads"));

/* ======================
   PostgreSQL (POOL)
====================== */
const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "toolrental1",
});

pool
    .connect()
    .then((client) => {
        console.log("✅ PostgreSQL connected");
        client.release();
    })
    .catch((err) => console.error("❌ DB error:", err));

/* 🔑 SINGLE SOURCE OF DB */
app.set("db", pool);

/* ======================
   JWT SECRET
====================== */
const JWT_SECRET = process.env.JWT_SECRET || "toolrental-super-secret-2026";

/* ======================
   AUTH ROUTES
====================== */
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password, phone, address } = req.body;
        const hash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, phone, address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email`,
            [name, email, hash, phone, address]
        );

        const token = jwt.sign({ userId: result.rows[0].id }, JWT_SECRET, {
            expiresIn: "7d",
        });

        res.json({ token, user: result.rows[0] });
    } catch (err) {
        if (err.code === "23505") {
            return res.status(400).json({ message: "Email already exists" });
        }
        res.status(500).json({ message: err.message });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query("SELECT * FROM users WHERE email = $1", [
            email,
        ]);

        const user = result.rows[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
            expiresIn: "7d",
        });

        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email },
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get("/api/auth/me", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "No token" });

        const decoded = jwt.verify(token, JWT_SECRET);

        const result = await pool.query(
            "SELECT id, name, email FROM users WHERE id = $1",
            [decoded.userId]
        );

        if (!result.rows[0]) {
            return res.status(401).json({ message: "User not found" });
        }

        res.json(result.rows[0]);
    } catch {
        res.status(401).json({ message: "Invalid token" });
    }
});

/* ======================
   ROUTES
====================== */
app.use("/api/users", userRoutes);
app.use("/api/tools", toolRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/stripe", stripeWebhookRouter);
app.use("/api/chat", chatRoutes);
app.use("/api/reviews", reviewRoutes); // ✅ NEW
app.use("/api/profile", profileRoutes);

app.get("/api/hello", (req, res) =>
    res.json({ message: "ToolRental Backend Ready!" })
);

/* ======================
   SOCKET.IO SETUP
====================== */
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true,
    },
});

// Make io accessible in routes via req.app.get("io")
app.set("io", io);

// ✅ Socket auth using same JWT you already use
io.use((socket, next) => {
    try {
        const token = socket.handshake?.auth?.token;
        if (!token) return next(new Error("No token"));

        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.userId;

        if (!socket.userId) return next(new Error("Invalid token payload"));
        next();
    } catch (err) {
        next(new Error("Unauthorized"));
    }
});

// ✅ Secure join: only allow owner/renter in that conversation room
io.on("connection", (socket) => {
    socket.on("joinConversation", async ({ conversationId }) => {
        try {
            const { rows } = await pool.query(
                `SELECT id FROM conversations
         WHERE id = $1 AND (owner_id = $2 OR renter_id = $2)`,
                [conversationId, socket.userId]
            );

            if (rows.length === 0) return;
            socket.join(`conv:${conversationId}`);
        } catch (err) {
            console.error("joinConversation error:", err.message);
        }
    });

    socket.on("leaveConversation", ({ conversationId }) => {
        socket.leave(`conv:${conversationId}`);
    });
});

/* TEST PROFILE ROUTE */
app.get("/api/profile/test", (req, res) => {
    res.json({ message: "Profile routes are loaded!" });
});
/* ======================
   SERVER
====================== */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () =>
    console.log(`🚀 Server running on http://localhost:${PORT}`)
);
