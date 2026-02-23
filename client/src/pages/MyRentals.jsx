import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function MyRentals() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");
    const navigate = useNavigate();

    const load = async () => {
        try {
            setLoading(true);
            const res = await fetch("http://localhost:5000/api/rentals/my", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json().catch(() => []);
            setItems(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!token) return;
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const markReturned = async (rentalId) => {
        try {
            const res = await fetch(`http://localhost:5000/api/rentals/${rentalId}/return`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                alert(data.message || "Failed");
                return;
            }

            alert("✅ Marked as returned. Waiting for owner confirmation.");
            load();
        } catch (e) {
            console.error(e);
            alert("Failed to mark returned");
        }
    };

    const badge = (status) => {
        const s = String(status || "").toLowerCase();
        if (s === "approved") return "bg-green-50 text-green-700 border-green-100";
        if (s === "rejected") return "bg-red-50 text-red-700 border-red-100";
        if (s === "returned_pending") return "bg-blue-50 text-blue-700 border-blue-100";
        if (s === "completed") return "bg-purple-50 text-purple-700 border-purple-100";
        return "bg-yellow-50 text-yellow-700 border-yellow-100";
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-6xl mx-auto px-6 py-10">
                    <h1 className="text-2xl font-bold text-gray-900">My Rentals</h1>
                    <p className="text-gray-600 mt-2">Please login to see your rentals.</p>
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
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                            My Rentals
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Your rented tools + return confirmation workflow.
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
                        <p className="text-gray-700 font-semibold">No rentals yet.</p>
                        <p className="text-sm text-gray-500 mt-1">Browse tools and request one.</p>
                        <Link
                            to="/tools"
                            className="inline-block mt-4 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition font-semibold"
                        >
                            Browse Tools
                        </Link>
                    </div>
                ) : (
                    <div className="mt-6 space-y-4">
                        {items.map((r) => {
                            const status = String(r.status || "").toLowerCase();

                            return (
                                <div
                                    key={r.id}
                                    className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-12">
                                        {/* Image */}
                                        <div className="md:col-span-3">
                                            {r.tool_image_url ? (
                                                <img
                                                    src={`http://localhost:5000${r.tool_image_url}`}
                                                    alt={r.tool_name}
                                                    className="w-full h-48 md:h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-48 md:h-full bg-gray-100 flex items-center justify-center text-gray-500">
                                                    No Image
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="md:col-span-9 p-5">
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                                <div>
                                                    <h2 className="text-lg font-bold text-gray-900">{r.tool_name}</h2>

                                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                                        <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-xs font-semibold">
                                                            ${r.price_per_day} / day
                                                        </span>

                                                        <span
                                                            className={`border px-3 py-1 rounded-full text-xs font-semibold ${badge(
                                                                r.status
                                                            )}`}
                                                        >
                                                            {String(r.status || "").toUpperCase()}
                                                        </span>

                                                        <span className="text-xs text-gray-500">
                                                            {String(r.start_date).slice(0, 10)} →{" "}
                                                            {String(r.end_date).slice(0, 10)}
                                                        </span>
                                                    </div>

                                                    <div className="mt-3 text-sm text-gray-600">
                                                        <span className="font-semibold">Owner:</span> {r.owner_name}{" "}
                                                        <span className="text-gray-400">({r.owner_email})</span>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex flex-col gap-2 items-end">
                                                    {status === "approved" && (
                                                        <button
                                                            onClick={() => markReturned(r.id)}
                                                            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition"
                                                        >
                                                            Mark Returned
                                                        </button>
                                                    )}

                                                    {status === "returned_pending" && (
                                                        <div className="text-sm text-gray-500">
                                                            Waiting for owner confirmation…
                                                        </div>
                                                    )}

                                                    {status === "completed" && (
                                                        <button
                                                            onClick={() => navigate(`/tools/${r.tool_id}`)}
                                                            className="bg-purple-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-purple-700 transition"
                                                        >
                                                            Leave Review
                                                        </button>
                                                    )}

                                                    <Link
                                                        to={`/tools/${r.tool_id}`}
                                                        className="text-sm text-blue-600 hover:underline"
                                                    >
                                                        View Tool →
                                                    </Link>
                                                </div>
                                            </div>

                                            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                                                <p className="text-xs text-gray-500">
                                                    Workflow: Approved → Mark Returned → Owner Confirms → Completed → Review
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
