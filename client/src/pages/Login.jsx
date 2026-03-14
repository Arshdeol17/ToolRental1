import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                alert(data.message || "Login failed");
                setLoading(false);
                return;
            }

            // ✅ IMPORTANT: save BOTH token + user
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            // ✅ notify app to refresh nav state
            window.dispatchEvent(new Event("login"));
            window.dispatchEvent(new Event("storage"));

            navigate("/profile");
        } catch (err) {
            console.error(err);
            alert("Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-md mx-auto px-6 py-10">
                <h1 className="text-3xl font-extrabold text-gray-900">Login</h1>
                <p className="text-sm text-gray-600 mt-1">Login to your ToolRental account.</p>

                <form onSubmit={submit} className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Email</label>
                        <input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            type="email"
                            className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2"
                            placeholder="you@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Password</label>
                        <input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            type="password"
                            className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        disabled={loading}
                        className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>

                    <p className="text-sm text-gray-600">
                        Don’t have an account?{" "}
                        <Link to="/register" className="text-blue-600 hover:underline">
                            Register →
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}