module.exports = async function adminMiddleware(req, res, next) {
    try {
        const db = req.app.get("db");

        const result = await db.query(
            "SELECT role FROM users WHERE id = $1",
            [req.userId]
        );

        const role = result.rows[0]?.role || "user";
        if (role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
        }

        req.role = role;
        next();
    } catch (err) {
        return res.status(500).json({ message: "Admin check failed" });
    }
};