// client/src/pages/Transactions.jsx (READY TO PASTE)

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Transactions() {
    const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
    const token = localStorage.getItem("token");

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            setLoading(true);

            if (!token) {
                setItems([]);
                setLoading(false);
                return;
            }

            // ✅ IMPORTANT: must call /api/transactions/my
            const res = await fetch(`${API_BASE}/api/transactions/my`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                console.error("Transactions API error:", res.status, data);
                alert(data?.message || `Failed to load transactions (${res.status})`);
                setItems([]);
                return;
            }

            setItems(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            alert("Failed to load transactions");
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!token) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-6xl mx-auto px-6 py-10">
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Transactions</h1>
                    <p className="text-gray-600 mt-2">Please login to see your transactions.</p>
                    <Link to="/login" className="inline-block mt-4 text-blue-600 hover:underline">
                        Go to Login →
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-6 py-10">
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Transactions</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Your Stripe payment history (as renter or owner).
                        </p>
                    </div>

                    <button
                        onClick={load}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                    >
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <div className="mt-6 text-gray-600">Loading...</div>
                ) : items.length === 0 ? (
                    <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                        <p className="text-gray-700 font-semibold">No transactions yet.</p>
                        <p className="text-sm text-gray-500 mt-1">After you pay for a rental, it will appear here.</p>
                    </div>
                ) : (
                    <div className="mt-6 space-y-4">
                        {items.map((t) => (
                            <div
                                key={t.id}
                                className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex items-center justify-between"
                            >
                                <div>
                                    <div className="text-sm text-gray-500">
                                        {String(t.created_at).slice(0, 19).replace("T", " ")}
                                    </div>

                                    <div className="text-lg font-bold text-gray-900">
                                        {t.tool_name || `Tool #${t.tool_id}`}
                                    </div>

                                    <div className="text-sm text-gray-600 mt-1">
                                        Status: <span className="font-semibold">{t.status}</span>
                                    </div>

                                    <div className="text-xs text-gray-400 mt-1">
                                        Session: {t.stripe_checkout_session_id}
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-xl font-extrabold text-gray-900">
                                        {String(t.currency || "cad").toUpperCase()} {Number(t.amount).toFixed(2)}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        Rental #{t.rental_id}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}