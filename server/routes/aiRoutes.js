const express = require("express");

const router = express.Router();

/*
  POST /api/ai/chat
  body: { message: "hi", history?: [{role:"user"|"assistant", content:"..."}] }
*/
router.post("/chat", async (req, res) => {
    try {
        const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
        const model = process.env.OLLAMA_MODEL || "llama3.1:8b";

        const { message, history } = req.body || {};
        const userMsg = (message || "").trim();
        if (!userMsg) return res.status(400).json({ message: "Message is required" });

        // Keep history small to avoid slow responses
        const safeHistory = Array.isArray(history) ? history.slice(-10) : [];

        const payload = {
            model,
            stream: false,
            messages: [
                {
                    role: "system",
                    content:
                        "You are ToolRental's helpful assistant. Answer questions about tools, rentals, payments, transactions, and app usage. Keep answers short and clear.",
                },
                ...safeHistory,
                { role: "user", content: userMsg },
            ],
        };

        // Node 18+ has fetch built-in
        const ollamaRes = await fetch(`${baseUrl}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!ollamaRes.ok) {
            const text = await ollamaRes.text();
            return res.status(500).json({
                message: "Ollama error",
                details: text,
            });
        }

        const data = await ollamaRes.json();

        const reply =
            data?.message?.content ||
            data?.response || // (some older endpoints)
            "Sorry, I couldn't generate a reply.";

        return res.json({ reply });
    } catch (err) {
        console.error("AI chat error:", err);
        return res.status(500).json({ message: err.message || "AI server error" });
    }
});

module.exports = router;