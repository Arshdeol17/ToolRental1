const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Initialize Stripe


/* =========================
   AUTH MIDDLEWARE
========================= */
const auth = (req, res, next) => {
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
};

/* =========================
   CREATE PAYMENT INTENT
   POST /api/payment/create-intent
========================= */
router.post("/create-intent", auth, async (req, res) => {
    try {
        const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
        const db = req.app.get("db");


        if (!rentalId) {
            return res.status(400).json({ message: "Rental ID is required" });
        }

        // Get rental details
        const rentalResult = await db.query(
            `SELECT r.*, t.name as tool_name, t.price_per_day, t.owner_id,
                    EXTRACT(DAY FROM (r.end_date - r.start_date)) + 1 as rental_days
             FROM rentals r
             JOIN tools t ON r.tool_id = t.id
             WHERE r.id = $1 AND r.renter_id = $2`,
            [rentalId, req.userId]
        );

        if (!rentalResult.rows[0]) {
            return res.status(404).json({ message: "Rental not found" });
        }

        const rental = rentalResult.rows[0];

        // Check if rental is approved
        if (rental.status.toLowerCase() !== "approved") {
            return res.status(400).json({ 
                message: "Payment can only be made for approved rentals" 
            });
        }

        // Calculate total amount (in cents for Stripe)
        const totalAmount = Math.round(
            rental.price_per_day * rental.rental_days * 100
        );

        // Create Stripe Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmount,
            currency: "usd",
            metadata: {
                rentalId: rentalId.toString(),
                renterId: req.userId.toString(),
                toolName: rental.tool_name,
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            amount: totalAmount,
            rentalDetails: {
                toolName: rental.tool_name,
                pricePerDay: rental.price_per_day,
                days: rental.rental_days,
                total: totalAmount / 100,
            },
        });
    } catch (err) {
        console.error("Payment intent error:", err);
        res.status(500).json({ message: "Failed to create payment intent" });
    }
});

/* =========================
   CONFIRM PAYMENT
   POST /api/payment/confirm
========================= */
router.post("/confirm", auth, async (req, res) => {
    try {
        const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
        const db = req.app.get("db");

        // Verify payment with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === "succeeded") {
            // Update rental status to paid
            await db.query(
                `UPDATE rentals 
                 SET status = 'paid'
                 WHERE id = $1 AND renter_id = $2`,
                [rentalId, req.userId]
            );

            res.json({ 
                message: "Payment confirmed successfully",
                status: "paid"
            });
        } else {
            res.status(400).json({ 
                message: "Payment not completed",
                status: paymentIntent.status
            });
        }
    } catch (err) {
        console.error("Payment confirmation error:", err);
        res.status(500).json({ message: "Failed to confirm payment" });
    }
});

/* =========================
   GET PAYMENT STATUS
   GET /api/payment/status/:rentalId
========================= */
router.get("/status/:rentalId", auth, async (req, res) => {
    try {
        const db = req.app.get("db");
        const { rentalId } = req.params;

        const result = await db.query(
            `SELECT status FROM rentals 
             WHERE id = $1 AND renter_id = $2`,
            [rentalId, req.userId]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ message: "Rental not found" });
        }

        res.json({ status: result.rows[0].status });
    } catch (err) {
        console.error("Get payment status error:", err);
        res.status(500).json({ message: "Failed to get payment status" });
    }
});

module.exports = router;