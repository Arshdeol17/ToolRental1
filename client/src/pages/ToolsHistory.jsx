import { useEffect, useMemo, useState } from "react";

export default function ToolsHistory() {
    const API_BASE = "http://localhost:5000";
    const token = localStorage.getItem("token");

    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    }, []);

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        if (!token) {
            setItems([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/api/rentals/history`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                alert(data?.message || "Failed to load tools history");
                setItems([]);
            } else {
                setItems(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to load tools history");
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line
    }, []);

    const statusBadge = (status) => {
        const s = String(status || "").toLowerCase();
        const base = "inline-block px-2 py-1 text-xs font-semibold rounded border";

        if (s === "approved")
            return (
                <span className={`${base} bg-green-100 border-green-300`}>Approved</span>
            );
        if (s === "rejected")
            return (
                <span className={`${base} bg-red-100 border-red-300`}>Rejected</span>
            );
        if (s === "returned_pending")
            return (
                <span className={`${base} bg-yellow-100 border-yellow-300`}>
                    Returned (Waiting)
                </span>
            );
        if (s === "completed")
            return (
                <span className={`${base} bg-blue-100 border-blue-300`}>Completed</span>
            );

        return (
            <span className={`${base} bg-gray-100 border-gray-300`}>{status}</span>
        );
    };

    const roleText = (row) => {
        const me = user?.id;
        if (!me) return "";
        if (String(row.renter_id) === String(me)) return "You rented";
        if (String(row.owner_id) === String(me)) return "You rented out";
        return "";
    };

    if (!token) {
        return (
            <div className="max-w-5xl mx-auto p-6">
                <h1 className="text-2xl font-bold mb-2">Tools History</h1>
                <p className="text-gray-600">Please login to see your tools history.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">Tools History</h1>
                <button
                    onClick={load}
                    className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                    Refresh
                </button>
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : items.length === 0 ? (
                <div className="bg-white border rounded p-4">
                    <p className="text-gray-600">No history yet.</p>
                    <p className="text-sm text-gray-500 mt-1">
                        Your rental/tool activity appears here after requests are approved,
                        rejected, returned, or completed.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {items.map((row) => (
                        <div key={row.id} className="bg-white border rounded p-4 flex gap-4">
                            <div className="w-28 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                {row.tool_image_url ? (
                                    <img
                                        src={`${API_BASE}${row.tool_image_url}`}
                                        alt={row.tool_name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                                        No image
                                    </div>
                                )}
                            </div>

                            <div className="flex-1">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-semibold">{row.tool_name}</h2>
                                        <p className="text-sm text-gray-600">{roleText(row)}</p>
                                    </div>
                                    <div className="text-right">
                                        {statusBadge(row.status)}
                                        <div className="text-sm text-gray-600 mt-1">
                                            ${Number(row.price_per_day || 0).toFixed(2)} / day
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-sm">
                                    <div>
                                        <span className="text-gray-600">Dates: </span>
                                        {String(row.start_date).slice(0, 10)} →{" "}
                                        {String(row.end_date).slice(0, 10)}
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Owner: </span>
                                        {row.owner_name} ({row.owner_email})
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Renter: </span>
                                        {row.renter_name} ({row.renter_email})
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Created: </span>
                                        {row.created_at
                                            ? String(row.created_at).slice(0, 19).replace("T", " ")
                                            : "-"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}