const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "toolrental-super-secret-2026";

function authMiddleware(req, res, next) {
    try {
        const header = req.headers.authorization;
        const token = header?.startsWith("Bearer ") ? header.split(" ")[1] : null;

        if (!token) return res.status(401).json({ message: "No token" });

        const decoded = jwt.verify(token, JWT_SECRET);

        // Your tokens store { userId: ... }
        req.userId = decoded.userId;

        if (!req.userId) return res.status(401).json({ message: "Invalid token" });

        next();
    } catch (err) {
        return res.status(401).json({ message: "Unauthorized" });
    }
}

module.exports = { authMiddleware };
