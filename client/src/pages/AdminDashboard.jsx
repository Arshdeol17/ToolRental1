import { useEffect, useState } from "react";

const API_BASE = "http://localhost:5000";

export default function AdminDashboard() {
    const [pendingTools, setPendingTools] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    const token = localStorage.getItem("token");

    const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };

    // ✅ Safe parser: handles JSON or HTML/text (prevents "Unexpected token <")
    const safeJson = async (res) => {
        const text = await res.text();
        try {
            return { ok: res.ok, data: JSON.parse(text) };
        } catch {
            return { ok: res.ok, data: { message: text } };
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);

            const toolsRes = await fetch(`${API_BASE}/api/admin/tools/pending`, { headers });
            const tools = await safeJson(toolsRes);
            if (!tools.ok) throw new Error(tools.data.message || "Failed to load pending tools");
            setPendingTools(Array.isArray(tools.data) ? tools.data : []);

            const usersRes = await fetch(`${API_BASE}/api/admin/users/pending`, { headers });
            const users = await safeJson(usersRes);
            if (!users.ok) throw new Error(users.data.message || "Failed to load pending users");
            setPendingUsers(Array.isArray(users.data) ? users.data : []);
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line
    }, []);

    // ⚠️ If your backend uses PUT instead of PATCH, change method here to "PUT"
    const approveTool = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/tools/${id}/approve`, {
                method: "PATCH",
                headers,
            });
            const out = await safeJson(res);
            if (!out.ok) throw new Error(out.data.message || "Approve tool failed");

            setPendingTools((prev) => prev.filter((t) => t.id !== id));
            alert("✅ Tool approved");
        } catch (err) {
            alert(err.message);
        }
    };

    const rejectTool = async (id, reason = "Rejected by admin") => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/tools/${id}/reject`, {
                method: "PATCH",
                headers,
                body: JSON.stringify({ reason }),
            });
            const out = await safeJson(res);
            if (!out.ok) throw new Error(out.data.message || "Reject tool failed");

            setPendingTools((prev) => prev.filter((t) => t.id !== id));
            alert("❌ Tool rejected");
        } catch (err) {
            alert(err.message);
        }
    };

    const approveUser = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/users/${id}/approve`, {
                method: "PATCH",
                headers,
            });
            const out = await safeJson(res);
            if (!out.ok) throw new Error(out.data.message || "Approve user failed");

            setPendingUsers((prev) => prev.filter((u) => u.id !== id));
            alert("✅ User approved");
        } catch (err) {
            alert(err.message);
        }
    };

    const rejectUser = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/users/${id}/reject`, {
                method: "PATCH",
                headers,
            });
            const out = await safeJson(res);
            if (!out.ok) throw new Error(out.data.message || "Reject user failed");

            setPendingUsers((prev) => prev.filter((u) => u.id !== id));
            alert("❌ User rejected");
        } catch (err) {
            alert(err.message);
        }
    };

    if (!token) {
        return (
            <div style={{ padding: 20 }}>
                <h2>Admin Dashboard</h2>
                <p>Please login as admin.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: 20, position: "relative", zIndex: 10 }}>
            <h2>Admin Dashboard</h2>

            <button
                onClick={loadData}
                style={{ padding: "8px 12px", marginBottom: 12, cursor: "pointer" }}
            >
                🔄 Refresh
            </button>

            {loading && <p>Loading...</p>}

            <h3>Pending Tools</h3>
            {pendingTools.length === 0 ? (
                <p>No pending tools 🎉</p>
            ) : (
                pendingTools.map((tool) => (
                    <div
                        key={tool.id}
                        style={{
                            border: "1px solid #ccc",
                            padding: 12,
                            marginBottom: 12,
                            borderRadius: 8,
                            background: "white",
                        }}
                    >
                        <p style={{ margin: 0 }}>
                            <b>{tool.name}</b>
                        </p>
                        <p style={{ margin: "6px 0" }}>Category: {tool.category}</p>
                        <p style={{ margin: "6px 0" }}>Condition: {tool.condition}</p>

                        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                            <button
                                type="button"
                                onClick={() => approveTool(tool.id)}
                                style={{ padding: "6px 12px", cursor: "pointer" }}
                            >
                                ✅ Approve
                            </button>
                            <button
                                type="button"
                                onClick={() => rejectTool(tool.id)}
                                style={{ padding: "6px 12px", cursor: "pointer" }}
                            >
                                ❌ Reject
                            </button>
                        </div>
                    </div>
                ))
            )}

            <h3>Pending Users</h3>
            {pendingUsers.length === 0 ? (
                <p>No pending users 🎉</p>
            ) : (
                pendingUsers.map((u) => (
                    <div
                        key={u.id}
                        style={{
                            border: "1px solid #ccc",
                            padding: 12,
                            marginBottom: 12,
                            borderRadius: 8,
                            background: "white",
                        }}
                    >
                        <p style={{ margin: 0 }}>
                            <b>{u.name || "(No name)"}</b> — {u.email}
                        </p>

                        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                            <button
                                type="button"
                                onClick={() => approveUser(u.id)}
                                style={{ padding: "6px 12px", cursor: "pointer" }}
                            >
                                ✅ Approve
                            </button>
                            <button
                                type="button"
                                onClick={() => rejectUser(u.id)}
                                style={{ padding: "6px 12px", cursor: "pointer" }}
                            >
                                ❌ Reject
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}