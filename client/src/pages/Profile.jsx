import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function Profile() {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);

    const [me, setMe] = useState(null);

    // editable fields
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");

    const loadMe = async () => {
        try {
            setLoading(true);

            if (!token) {
                navigate("/login");
                return;
            }

            const res = await fetch(`${API_BASE}/api/users/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.dispatchEvent(new Event("storage"));
                navigate("/login");
                return;
            }

            setMe(data);
            setName(data.name || "");
            setPhone(data.phone || "");
            setAddress(data.address || "");

            // keep navbar greeting updated
            localStorage.setItem(
                "user",
                JSON.stringify({ id: data.id, name: data.name, email: data.email, role: data.role })
            );
            window.dispatchEvent(new Event("storage"));
        } catch (e) {
            console.error(e);
            navigate("/login");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMe();
        // eslint-disable-next-line
    }, []);

    const saveProfile = async () => {
        try {
            setSaving(true);

            const res = await fetch(`${API_BASE}/api/users/me`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name, phone, address }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                alert(data.message || "Failed to update profile");
                return;
            }

            setMe(data);
            alert("✅ Profile updated!");
            localStorage.setItem(
                "user",
                JSON.stringify({ id: data.id, name: data.name, email: data.email, role: data.role })
            );
            window.dispatchEvent(new Event("storage"));
        } catch (e) {
            console.error(e);
            alert("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const deleteAccount = async () => {
        const ok = window.confirm(
            "Are you sure you want to delete your account? This cannot be undone."
        );
        if (!ok) return;

        try {
            const res = await fetch(`${API_BASE}/api/users/me`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                alert(data.message || "Failed to delete account");
                return;
            }

            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.dispatchEvent(new Event("storage"));
            alert("✅ Account deleted");
            navigate("/register");
        } catch (e) {
            console.error(e);
            alert("Failed to delete account");
        }
    };

    const sendPasswordReset = async () => {
        try {
            if (!me?.email) {
                alert("Email not found.");
                return;
            }

            setSending(true);

            const res = await fetch(`${API_BASE}/api/password/request-reset`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: me.email }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                alert(data.message || "Failed to send reset email");
                return;
            }

            alert("✅ Password reset link sent to your email (check inbox/spam).");
        } catch (e) {
            console.error(e);
            alert("Failed to send reset email");
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-5xl mx-auto px-6 py-10 text-gray-600">Loading profile...</div>
            </div>
        );
    }

    if (!me) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-5xl mx-auto px-6 py-10">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Profile</h1>
                <p className="text-sm text-gray-500 mt-1">View and manage your account</p>

                <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700">Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2"
                                placeholder="Your name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700">Email</label>
                            <input
                                value={me.email || ""}
                                disabled
                                className="mt-1 w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700">Contact / Phone</label>
                            <input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2"
                                placeholder="Phone number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700">Role</label>
                            <input
                                value={me.role || "user"}
                                disabled
                                className="mt-1 w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-gray-600"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700">Address</label>
                            <textarea
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 min-h-[90px]"
                                placeholder="Your address"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            onClick={saveProfile}
                            disabled={saving}
                            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>

                        <button
                            onClick={sendPasswordReset}
                            disabled={sending}
                            className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-60"
                        >
                            {sending ? "Sending..." : "Change Password"}
                        </button>

                        <button
                            onClick={deleteAccount}
                            className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-red-700"
                        >
                            Delete Account
                        </button>
                    </div>

                    <p className="mt-4 text-xs text-gray-500">
                        Password reset link is sent to your email. Check spam/junk folder too.
                    </p>
                </div>
            </div>
        </div>
    );
}