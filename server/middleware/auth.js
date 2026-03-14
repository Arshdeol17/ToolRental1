const jwt = require("jsonwebtoken");

function auth(req, res, next) {
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
}

async function requireAdmin(req, res, next) {
    try {
        const db = req.app.get("db");
        const { rows } = await db.query("SELECT role FROM users WHERE id=$1", [req.userId]);
        const role = rows[0]?.role || "user";
        if (role !== "admin") return res.status(403).json({ message: "Admin only" });
        next();
    } catch (e) {
        return res.status(500).json({ message: "Admin check failed" });
    }
}

module.exports = { auth, requireAdmin };