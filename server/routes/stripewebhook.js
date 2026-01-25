const express = require('express');
const router = express.Router();

router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const sig = req.headers['stripe-signature'];
    console.log('Stripe webhook received');
    res.json({ received: true });
});

module.exports = router;
