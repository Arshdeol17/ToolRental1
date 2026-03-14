import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function ResetPassword() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const token = params.get("token") || "";

    const [p1, setP1] = useState("");
    const [p2, setP2] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!token) return alert("Missing token.");
        if (p1.length < 6) return alert("Password must be at least 6 characters.");
        if (p1 !== p2) return alert("Passwords do not match.");

        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/api/password/reset`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword: p1 }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                alert(data.message || "Reset failed");
                return;
            }

            alert("✅ Password updated! Please login.");
            navigate("/login");
        } catch (e) {
            console.error(e);
            alert("Reset failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-md mx-auto px-6 py-10">
                <h1 className="text-3xl font-extrabold text-gray-900">Reset Password</h1>

                <form onSubmit={submit} className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700">New Password</label>
                        <input
                            type="password"
                            value={p1}
                            onChange={(e) => setP1(e.target.value)}
                            className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Confirm Password</label>
                        <input
                            type="password"
                            value={p2}
                            onChange={(e) => setP2(e.target.value)}
                            className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2"
                            required
                        />
                    </div>

                    <button
                        disabled={loading}
                        className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60"
                    >
                        {loading ? "Updating..." : "Update Password"}
                    </button>
                </form>
            </div>
        </div>
    );
}