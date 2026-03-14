import { useEffect, useState } from "react";

export default function RentalRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");

    const loadRequests = async () => {
        try {
            setLoading(true);

            const res = await fetch("http://localhost:5000/api/rentals/requests", {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json().catch(() => []);
            setRequests(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const callAction = async (id, action) => {
        try {
            const res = await fetch(`http://localhost:5000/api/rentals/${id}/${action}`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                alert(data.message || "Failed");
                return;
            }

            loadRequests();
        } catch (e) {
            alert("Failed to update request");
            console.error(e);
        }
    };

    const statusBadge = (status) => {
        const s = String(status || "").toLowerCase();
        if (s === "approved") return "bg-green-50 text-green-700 border border-green-100";
        if (s === "rejected") return "bg-red-50 text-red-700 border border-red-100";
        if (s === "returned_pending") return "bg-blue-50 text-blue-700 border border-blue-100";
        if (s === "completed") return "bg-purple-50 text-purple-700 border border-purple-100";
        return "bg-yellow-50 text-yellow-700 border border-yellow-100";
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-6 py-10">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                            Rental Requests
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Approve, reject, and confirm returns.
                        </p>
                    </div>

                    <button
                        onClick={loadRequests}
                        className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                    >
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <div className="mt-6 text-gray-600">Loading requests...</div>
                ) : requests.length === 0 ? (
                    <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                        <p className="text-gray-700 font-semibold">No requests yet.</p>
                        <p className="text-sm text-gray-500 mt-1">
                            When someone requests a rental, it will show up here.
                        </p>
                    </div>
                ) : (
                    <div className="mt-6 space-y-4">
                        {requests.map((r) => {
                            const statusLower = String(r.status || "").toLowerCase();
                            const isPending = statusLower === "pending";
                            const isReturnedPending = statusLower === "returned_pending";

                            return (
                                <div
                                    key={r.id}
                                    className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
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

                                        <div className="md:col-span-9 p-5">
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                                <div>
                                                    <h2 className="text-lg font-bold text-gray-900">{r.tool_name}</h2>

                                                    <p className="text-sm text-gray-600 mt-1">
                                                        <span className="font-semibold">Customer:</span> {r.renter_name}{" "}
                                                        <span className="text-gray-400">({r.renter_email})</span>
                                                    </p>

                                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                                        <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-xs font-semibold">
                                                            ${r.price_per_day} / day
                                                        </span>

                                                        <span
                                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge(
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
                                                </div>

                                                {isPending ? (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => callAction(r.id, "approve")}
                                                            className="bg-green-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-green-700 transition"
                                                        >
                                                            Approve
                                                        </button>

                                                        <button
                                                            onClick={() => callAction(r.id, "reject")}
                                                            className="bg-red-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-red-700 transition"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                ) : isReturnedPending ? (
                                                    <button
                                                        onClick={() => callAction(r.id, "confirm-return")}
                                                        className="bg-purple-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-purple-700 transition"
                                                    >
                                                        Confirm Returned
                                                    </button>
                                                ) : (
                                                    <div className="text-sm text-gray-500">
                                                        This request is{" "}
                                                        <span className="font-semibold">
                                                            {String(r.status || "").toUpperCase()}
                                                        </span>
                                                        .
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                                                <p className="text-xs text-gray-500">
                                                    Tip: Confirm Returned will mark rental completed and tool becomes available again.
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
