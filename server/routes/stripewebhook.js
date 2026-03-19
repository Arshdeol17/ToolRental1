// server/routes/stripeWebhook.js (READY TO PASTE)

const express = require("express");
const Stripe = require("stripe");

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
});

// IMPORTANT:
// server.js already mounts this route with express.raw({ type: "application/json" })
// so do NOT use express.json() here.

router.post("/", async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        if (!endpointSecret) {
            console.error("❌ STRIPE_WEBHOOK_SECRET missing in .env");
            return res.status(500).send("Webhook secret missing");
        }

        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error("❌ Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        const db = req.app.get("dbClient") || req.app.get("db");

        if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            console.log("WEBHOOK METADATA:", session.metadata);

            const rentalId = Number(session?.metadata?.rentalId);
            const toolId = Number(session?.metadata?.toolId);
            const payerId = Number(session?.metadata?.renterId);  // renter pays
            const receiverId = Number(session?.metadata?.ownerId); // owner receives

            const checkoutSessionId = session.id;

            const paymentIntentId =
                typeof session.payment_intent === "string" ? session.payment_intent : null;

            const amountTotalCents = Number(session.amount_total || 0);
            const amountDollars = Number((amountTotalCents / 100).toFixed(2)); // ✅ numeric(10,2)

            const currency = String(session.currency || "cad").toLowerCase();

            if (!rentalId || !toolId || !payerId || !receiverId) {
                console.warn("⚠️ Missing metadata in Stripe session:", session?.metadata);
                return res.json({ received: true });
            }

            // 1) Mark rental paid
            await db.query(
                `UPDATE rentals SET is_paid = true, paid_at = NOW() WHERE id = $1`,
                [rentalId]
            );

            // 2) Insert into YOUR transactions schema
            await db.query(
                `
                INSERT INTO transactions
                  (rental_id, tool_id, payer_id, receiver_id,
                   stripe_payment_intent_id, amount, currency, status, stripe_checkout_session_id)
                VALUES
                  ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                ON CONFLICT (stripe_checkout_session_id) DO NOTHING
                `,
                [
                    rentalId,
                    toolId,
                    payerId,
                    receiverId,
                    paymentIntentId,
                    amountDollars,
                    currency,
                    "succeeded",
                    checkoutSessionId,
                ]
            );

            console.log("✅ Transaction inserted:", {
                rentalId,
                toolId,
                payerId,
                receiverId,
                amountDollars,
                currency,
                checkoutSessionId,
            });
        }

        return res.json({ received: true });
    } catch (err) {
        console.error("❌ Webhook handler error:", err?.message || err);
        return res.status(500).send("Webhook handler failed");
    }
});

module.exports = router;