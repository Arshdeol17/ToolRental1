import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";

export default function ToolDetails() {
    const { id } = useParams();

    const [tool, setTool] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    // Rent modal
    const [showRentModal, setShowRentModal] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [requesting, setRequesting] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadTool = async () => {
            try {
                setLoading(true);
                setErrorMsg("");

                const res = await fetch(`http://localhost:5000/api/tools/${id}`);

                if (!res.ok) {
                    const maybeJson = await res.json().catch(() => null);
                    const msg =
                        maybeJson?.message ||
                        maybeJson?.error ||
                        (res.status === 404 ? "Tool not found." : "Failed to load tool.");

                    if (isMounted) {
                        setTool(null);
                        setErrorMsg(msg);
                    }
                    return;
                }

                const data = await res.json();
                if (isMounted) setTool(data);
            } catch {
                if (isMounted) {
                    setTool(null);
                    setErrorMsg("Failed to load tool. Please try again.");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadTool();
        return () => {
            isMounted = false;
        };
    }, [id]);

    const closeModal = () => {
        setShowRentModal(false);
        setStartDate("");
        setEndDate("");
    };

    const openModal = () => {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please login first to rent a tool.");
            return;
        }
        setShowRentModal(true);
    };

    const handleRequestRental = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please login first to rent a tool.");
            return;
        }

        if (!startDate || !endDate) {
            alert("Please select start and end dates.");
            return;
        }

        try {
            setRequesting(true);

            const res = await fetch("http://localhost:5000/api/rentals/request", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    toolId: tool.id,
                    startDate,
                    endDate,
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                alert(data.message || data.error || "Failed to send rental request");
                return;
            }

            alert("✅ Rental request sent! The owner will approve or reject it.");
            closeModal();
        } catch (err) {
            alert(err.message || "Failed to request rental");
        } finally {
            setRequesting(false);
        }
    };

    // ESC close modal
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === "Escape") closeModal();
        };
        if (showRentModal) window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [showRentModal]);

    const rentDisabled = requesting || !startDate || !endDate;

    // Safe fields
    const categoryText = tool?.category || "Uncategorized";
    const conditionText = tool?.condition || "Not specified";
    const ownerText = tool?.owner_name || "N/A";
    const emailText = tool?.owner_email || "N/A";

    const pickupLocation = useMemo(() => "Pickup: Contact owner for location", []);
    const rentalRules = useMemo(
        () => [
            "Return in the same condition",
            "Late returns may be charged extra",
            "Damage must be reported immediately",
        ],
        []
    );

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-6 py-12">
                <p className="text-gray-600">Loading tool details...</p>
            </div>
        );
    }

    if (!tool) {
        return (
            <div className="max-w-5xl mx-auto px-6 py-12">
                <Link to="/tools" className="text-blue-600 hover:underline">
                    ← Back to tools
                </Link>

                <div className="mt-8 bg-white shadow rounded-2xl p-6 border border-gray-200">
                    <h2 className="text-xl font-bold mb-2">Tool not available</h2>
                    <p className="text-gray-600">{errorMsg || "Tool not found."}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ✅ Smaller overall container */}
            <div className="max-w-5xl mx-auto px-6 py-10">
                <Link to="/tools" className="text-blue-600 hover:underline">
                    ← Back to tools
                </Link>

                {/* ✅ Tighter layout (10 columns instead of 12) */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-10 gap-6">
                    {/* LEFT */}
                    <div className="lg:col-span-6">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            {/* Image (still full, but card is smaller now) */}
                            <div className="relative">
                                {tool.image_url ? (
                                    <img
                                        src={`http://localhost:5000${tool.image_url}`}
                                        alt={tool.name}
                                        className="w-full h-[260px] object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-[260px] bg-gray-100 flex items-center justify-center text-gray-500">
                                        No Image
                                    </div>
                                )}

                                {/* Pills */}
                                <div className="absolute top-4 left-4 flex items-center gap-2">
                                    <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-xs font-semibold">
                                        ${tool.price_per_day} / day
                                    </span>
                                    <span className="bg-green-50 text-green-700 border border-green-100 px-3 py-1 rounded-full text-xs font-semibold">
                                        Available
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                                    {tool.name}
                                </h1>

                                <p className="text-gray-600 mt-2 text-sm leading-relaxed">
                                    {tool.description || "No description provided."}
                                </p>

                                {/* Quick info cards */}
                                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                        <p className="text-xs text-gray-500">Category</p>
                                        <p className="font-semibold text-gray-900 mt-1">
                                            {categoryText}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                        <p className="text-xs text-gray-500">Condition</p>
                                        <p className="font-semibold text-gray-900 mt-1">
                                            {conditionText}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                        <p className="text-xs text-gray-500">Owner</p>
                                        <p className="font-semibold text-gray-900 mt-1">
                                            {ownerText}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Extra sections */}
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                <h2 className="text-base font-bold text-gray-900">
                                    Pickup & Contact
                                </h2>
                                <p className="text-sm text-gray-600 mt-2">{pickupLocation}</p>

                                <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-4">
                                    <p className="text-xs text-gray-500">Contact</p>
                                    <p className="text-sm font-semibold text-gray-900 mt-1">
                                        {emailText}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                <h2 className="text-base font-bold text-gray-900">
                                    Rental rules
                                </h2>
                                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                                    {rentalRules.map((rule) => (
                                        <li key={rule} className="flex gap-2">
                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
                                            <span>{rule}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-4 text-xs text-gray-500">
                                    Tip: You can customize rules per tool later.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT */}
                    <div className="lg:col-span-4">
                        <div className="lg:sticky lg:top-6 space-y-4">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Daily rate</p>
                                        <p className="text-2xl font-extrabold text-gray-900">
                                            ${tool.price_per_day}
                                            <span className="text-sm font-semibold text-gray-500">
                                                {" "}
                                                / day
                                            </span>
                                        </p>
                                    </div>

                                    <span className="bg-green-50 text-green-700 border border-green-100 px-3 py-1 rounded-full text-xs font-semibold">
                                        Available
                                    </span>
                                </div>

                                <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-4">
                                    <p className="text-xs text-gray-500">What happens next?</p>
                                    <p className="text-sm text-gray-700 mt-1">
                                        Choose dates → Send request → Owner approves
                                    </p>
                                </div>

                                <button
                                    onClick={openModal}
                                    className="mt-5 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
                                >
                                    Rent this tool
                                </button>

                                <p className="text-xs text-gray-500 mt-3">
                                    You won’t be charged until the owner approves.
                                </p>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                <h3 className="text-sm font-bold text-gray-900">Safety tips</h3>
                                <p className="text-sm text-gray-600 mt-2">
                                    Check the tool before use. Ask for a quick demo if needed.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RENT MODAL */}
            {showRentModal && (
                <div
                    className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeModal();
                    }}
                >
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 border border-gray-100">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold">Request a rental</h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    Select your dates for{" "}
                                    <span className="font-semibold">{tool.name}</span>.
                                </p>
                            </div>

                            <button
                                onClick={closeModal}
                                className="text-gray-500 hover:text-gray-800 text-xl leading-none"
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="mt-5 flex gap-3">
                            <button
                                onClick={closeModal}
                                className="w-1/2 border border-gray-200 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleRequestRental}
                                disabled={rentDisabled}
                                className={`w-1/2 py-2.5 rounded-xl font-semibold transition ${rentDisabled
                                        ? "bg-gray-400 text-white cursor-not-allowed"
                                        : "bg-blue-600 text-white hover:bg-blue-700"
                                    }`}
                            >
                                {requesting ? "Sending..." : "Send Request"}
                            </button>
                        </div>

                        <p className="text-xs text-gray-500 mt-3">
                            The owner will approve or reject your request.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
