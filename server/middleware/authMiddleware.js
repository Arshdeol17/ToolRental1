const jwt = require("jsonwebtoken");

module.exports = function authMiddleware(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : null;

        if (!token) return res.status(401).json({ message: "No token provided" });

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "toolrental-super-secret-2026"
        );

        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};