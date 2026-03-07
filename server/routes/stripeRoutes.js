const express = require("express");
const jwt = require("jsonwebtoken");
const Stripe = require("stripe");

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
});

/* =========================
   AUTH MIDDLEWARE
========================= */
function auth(req, res, next) {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "No token" });

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "toolrental-super-secret-2026"
        );

        req.userId = decoded.userId;
        if (!req.userId) return res.status(401).json({ message: "Invalid token payload" });

        next();
    } catch (e) {
        return res.status(401).json({ message: "Invalid token" });
    }
}

/* =========================================================
   CREATE CHECKOUT SESSION
   POST /api/stripe/create-checkout-session
   body: { rentalId }
========================================================= */
router.post("/create-checkout-session", auth, async (req, res) => {
    try {
        const db = req.app.get("db");
        const { rentalId } = req.body || {};

        if (!rentalId) return res.status(400).json({ message: "Missing rentalId" });

        const rentalRes = await db.query(
            `
      SELECT
        r.id,
        r.renter_id,
        r.owner_id,
        r.tool_id,
        r.start_date,
        r.end_date,
        r.status,
        COALESCE(r.is_paid,false) AS is_paid,
        t.name AS tool_name,
        t.price_per_day
      FROM rentals r
      JOIN tools t ON t.id = r.tool_id
      WHERE r.id = $1
      `,
            [rentalId]
        );

        const rental = rentalRes.rows[0];
        if (!rental) return res.status(404).json({ message: "Rental not found" });

        if (String(rental.renter_id) !== String(req.userId)) {
            return res.status(403).json({ message: "Not allowed" });
        }

        if (String(rental.status || "").toLowerCase() !== "approved") {
            return res.status(400).json({ message: "Rental must be approved before payment" });
        }

        if (rental.is_paid) {
            return res.status(400).json({ message: "Already paid" });
        }

        const start = new Date(rental.start_date);
        const end = new Date(rental.end_date);
        const diffMs = end.getTime() - start.getTime();
        const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        const pricePerDay = Number(rental.price_per_day || 0);
        const amountCents = Math.round(days * pricePerDay * 100);

        if (!amountCents || amountCents < 50) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

        // ✅ Stripe requires valid absolute URLs
        const successUrl = `${CLIENT_URL}/payment-success?rentalId=${rental.id}&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${CLIENT_URL}/payment-cancel?rentalId=${rental.id}`;

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],

            line_items: [
                {
                    price_data: {
                        currency: (process.env.STRIPE_CURRENCY || "cad").toLowerCase(),
                        product_data: {
                            name: `ToolRental - ${rental.tool_name}`,
                            description: `${days} day(s) @ $${pricePerDay}/day`,
                        },
                        unit_amount: amountCents,
                    },
                    quantity: 1,
                },
            ],

            metadata: {
                rentalId: String(rental.id),
                toolId: String(rental.tool_id),
                renterId: String(rental.renter_id),
                ownerId: String(rental.owner_id),
            },

            success_url: successUrl,
            cancel_url: cancelUrl,
        });

        if (!session?.url) {
            return res.status(500).json({ message: "Stripe session created but URL missing" });
        }

        return res.json({ url: session.url });
    } catch (err) {
        console.error("create-checkout-session error:", err);
        // Send Stripe's message to frontend for debugging
        return res.status(500).json({ message: err?.message || "Stripe error" });
    }
});

module.exports = router;