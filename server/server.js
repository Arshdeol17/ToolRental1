// server.js (READY TO PASTE)

const dotenv = require("dotenv");
dotenv.config(); // ✅ MUST be first

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");
const { sendEmail } = require("./utils/email");

// Routes
const userRoutes = require("./routes/userRoutes");
const toolRoutes = require("./routes/toolRoutes");
const rentalRoutes = require("./routes/rentalRoutes");
const chatRoutes = require("./routes/chatRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminRoutes = require("./routes/adminRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const passwordRoutes = require("./routes/passwordRoutes");
const aiRoutes = require("./routes/aiRoutes");

// Stripe
const stripeRoutes = require("./routes/stripeRoutes");
const stripeWebhookRouter = require("./routes/stripeWebhook");

const app = express();

/* ======================
   CORS
====================== */
app.use(
    cors({
        origin: [process.env.CLIENT_URL || "http://localhost:5173", "http://localhost:5174"],
        credentials: true,
    })
);

/* ======================
   PostgreSQL (POOL)
====================== */
const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
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

// ✅ IMPORTANT for your OLD userRoutes.js (it uses dbClient)
app.set("dbClient", pool);

/* ======================
   Stripe Webhook (RAW)
   MUST be before express.json()
====================== */
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app.use("/api/stripe/webhook", stripeWebhookRouter);

/* ======================
   JSON + STATIC
====================== */
app.use(express.json());
app.use("/uploads", express.static("uploads"));

/* ======================
   JWT SECRET
====================== */
const JWT_SECRET = process.env.JWT_SECRET || "toolrental-super-secret-2026";

/* ======================
   AUTH ROUTES
====================== */
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password, phone, address } = req.body || {};
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Missing fields" });
        }

        const hash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, phone, address)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, name, email, role`,
            [name, email, hash, phone || "", address || ""]
        );

        const token = jwt.sign({ userId: result.rows[0].id }, JWT_SECRET, {
            expiresIn: "7d",
        });

        // ✅ Email should NOT break register
        try {
            await sendEmail({
                to: result.rows[0].email,
                subject: "Welcome to ToolRental 🎉",
                text: `Hi ${result.rows[0].name}, your profile has been created successfully.`,
                html: `
                    <h2>Welcome to ToolRental 🎉</h2>
                    <p>Hi <b>${result.rows[0].name}</b>,</p>
                    <p>Your profile has been created successfully.</p>
                `,
            });
        } catch (e) {
            console.error("Register email failed:", e.message);
        }

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
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ message: "Missing fields" });
        }

        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
            expiresIn: "7d",
        });

        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
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
            "SELECT id, name, email, role FROM users WHERE id = $1",
            [decoded.userId]
        );

        if (!result.rows[0]) return res.status(401).json({ message: "User not found" });
        res.json(result.rows[0]);
    } catch (e) {
        res.status(401).json({ message: "Invalid token" });
    }
});

/* ======================
   ROUTES
====================== */
app.use("/api/users", userRoutes);
app.use("/api/tools", toolRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/password", passwordRoutes);

// ✅ Transactions
app.use("/api/transactions", transactionRoutes);

// ✅ Stripe API routes
app.use("/api/stripe", stripeRoutes);

app.use("/api/chat", chatRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.get("/api/hello", (req, res) => res.json({ message: "ToolRental Backend Ready!" }));

/* ======================
   SOCKET.IO SETUP
====================== */
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: [process.env.CLIENT_URL || "http://localhost:5173", "http://localhost:5174"],
        credentials: true,
    },
});

app.set("io", io);

io.use((socket, next) => {
    try {
        const token = socket.handshake?.auth?.token;
        if (!token) return next(new Error("No token"));

        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.userId;

        if (!socket.userId) return next(new Error("Invalid token payload"));
        next();
    } catch {
        next(new Error("Unauthorized"));
    }
});

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

/* ======================
   SERVER
====================== */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));