import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function PaymentModal({ open, onClose, rentalId }) {
    const token = localStorage.getItem("token");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // reset modal state when opening/closing
    useEffect(() => {
        if (open) {
            setError("");
            setLoading(false);
        }
    }, [open]);

    const startCheckout = async () => {
        if (!rentalId) {
            setError("Missing rentalId");
            return;
        }
        if (!token) {
            setError("You are not logged in.");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const res = await fetch(`${API_BASE}/api/stripe/create-checkout-session`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ rentalId }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(data.message || "Failed to start payment");
                setLoading(false);
                return;
            }

            if (!data.url) {
                setError("Stripe Checkout URL missing.");
                setLoading(false);
                return;
            }

            // ✅ Redirect to Stripe Hosted Checkout page
            window.location.href = data.url;
        } catch (e) {
            console.error(e);
            setError("Failed to start payment");
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-md p-5 relative">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
                    type="button"
                >
                    ✕
                </button>

                <h2 className="text-xl font-bold">Pay with Stripe</h2>
                <p className="text-sm text-gray-600 mt-1">
                    You will be redirected to Stripe’s secure checkout page.
                </p>

                {error && (
                    <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                        {error}
                    </div>
                )}

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        type="button"
                        disabled={loading}
                    >
                        Cancel
                    </button>

                    <button
                        onClick={startCheckout}
                        className="px-4 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60"
                        type="button"
                        disabled={loading}
                    >
                        {loading ? "Redirecting..." : "Pay Now"}
                    </button>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                    Test card: <span className="font-mono">4242 4242 4242 4242</span> • Any future expiry • Any CVC
                </div>
            </div>
        </div>
    );
}