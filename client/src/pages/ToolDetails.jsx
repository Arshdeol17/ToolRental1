import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function ToolDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const token = localStorage.getItem("token");

    // ✅ Get logged-in user id from token
    let myUserId = null;
    try {
        if (token) {
            const decoded = jwtDecode(token);
            // your backend signs { userId: ... }
            myUserId = decoded?.userId ?? decoded?.id ?? decoded?.user_id ?? null;
        }
    } catch {
        myUserId = null;
    }

    const [tool, setTool] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    // Rent modal
    const [showRentModal, setShowRentModal] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [requesting, setRequesting] = useState(false);

    // ✅ Reviews state
    const [reviews, setReviews] = useState([]);
    const [reviewLoading, setReviewLoading] = useState(true);
    const [avgRating, setAvgRating] = useState(0);
    const [reviewCount, setReviewCount] = useState(0);

    const [canReview, setCanReview] = useState(false);
    const [myRating, setMyRating] = useState(5);
    const [myComment, setMyComment] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);

    // -----------------------
    // Load Tool
    // -----------------------
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

    // -----------------------
    // Load Reviews + Summary
    // -----------------------
    useEffect(() => {
        const loadReviews = async () => {
            try {
                setReviewLoading(true);

                const [revRes, sumRes] = await Promise.all([
                    fetch(`http://localhost:5000/api/reviews/tool/${id}`),
                    fetch(`http://localhost:5000/api/reviews/tool/${id}/summary`),
                ]);

                const revData = await revRes.json().catch(() => []);
                const sumData = await sumRes.json().catch(() => ({}));

                setReviews(Array.isArray(revData) ? revData : []);
                setAvgRating(Number(sumData.avg_rating || 0));
                setReviewCount(Number(sumData.review_count || 0));
            } catch (e) {
                console.error(e);
                setReviews([]);
                setAvgRating(0);
                setReviewCount(0);
            } finally {
                setReviewLoading(false);
            }
        };

        loadReviews();
    }, [id]);

    // -----------------------
    // Check if renter can review (must have COMPLETED rental)
    // -----------------------
    useEffect(() => {
        const checkEligibility = async () => {
            if (!token) {
                setCanReview(false);
                return;
            }

            try {
                const res = await fetch("http://localhost:5000/api/rentals/my", {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const data = await res.json().catch(() => []);

                const ok = Array.isArray(data)
                    ? data.some(
                        (r) =>
                            String(r.tool_id) === String(id) &&
                            String(r.status || "").toLowerCase() === "completed"
                    )
                    : false;

                setCanReview(ok);
            } catch (e) {
                console.error(e);
                setCanReview(false);
            }
        };

        checkEligibility();
    }, [id, token]);

    const closeModal = () => {
        setShowRentModal(false);
        setStartDate("");
        setEndDate("");
    };

    const openModal = () => {
        if (!token) {
            alert("Please login first to rent a tool.");
            return;
        }
        if (!tool?.available) {
            alert("This tool is currently unavailable.");
            return;
        }
        setShowRentModal(true);
    };

    const handleRequestRental = async () => {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const ownerId = tool?.owner_id ?? tool?.user_id ?? tool?.ownerId ?? null;
    const isOwner = myUserId && ownerId && String(myUserId) === String(ownerId);

    const handleDeleteTool = async () => {
        if (!token) {
            alert("Please login first.");
            return;
        }

        const ok = window.confirm("Delete this tool? This cannot be undone.");
        if (!ok) return;

        try {
            const res = await fetch(`http://localhost:5000/api/tools/${tool.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json().catch(() => ({}));

            if (res.status === 409) {
                alert(
                    data.message ||
                    "This tool has approved rentals, so it cannot be deleted."
                );
                return;
            }

            if (!res.ok) {
                alert(data.message || data.error || "Failed to delete tool.");
                return;
            }

            alert("✅ Tool deleted successfully");
            navigate("/tools");
        } catch (err) {
            console.error(err);
            alert("Failed to delete tool.");
        }
    };

    // ✅ PATCH availability (persists)
    const handleToggleAvailability = async () => {
        if (!token) {
            alert("Please login first.");
            return;
        }

        try {
            const res = await fetch(
                `http://localhost:5000/api/tools/${tool.id}/availability`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ available: !tool.available }),
                }
            );

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                alert(data.message || data.error || "Failed to update availability");
                return;
            }

            setTool(data);
        } catch (err) {
            console.error(err);
            alert("Failed to update availability");
        }
    };

    const AvailabilityPill = () => (
        <span
            className={`border px-3 py-1 rounded-full text-xs font-semibold ${tool?.available
                    ? "bg-green-50 text-green-700 border-green-100"
                    : "bg-gray-100 text-gray-700 border-gray-200"
                }`}
        >
            {tool?.available ? "Available" : "Unavailable"}
        </span>
    );

    // ✅ Submit review
    const submitReview = async () => {
        if (!token) {
            alert("Please login first.");
            return;
        }

        try {
            setSubmittingReview(true);

            const res = await fetch(`http://localhost:5000/api/reviews/tool/${id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ rating: myRating, comment: myComment }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                alert(data.message || "Failed to submit review");
                return;
            }

            alert("✅ Review submitted!");
            setMyComment("");
            setMyRating(5);

            // Reload reviews + summary
            const [revRes, sumRes] = await Promise.all([
                fetch(`http://localhost:5000/api/reviews/tool/${id}`),
                fetch(`http://localhost:5000/api/reviews/tool/${id}/summary`),
            ]);

            const revData = await revRes.json().catch(() => []);
            const sumData = await sumRes.json().catch(() => ({}));

            setReviews(Array.isArray(revData) ? revData : []);
            setAvgRating(Number(sumData.avg_rating || 0));
            setReviewCount(Number(sumData.review_count || 0));
        } catch (e) {
            console.error(e);
            alert("Failed to submit review");
        } finally {
            setSubmittingReview(false);
        }
    };

    // -----------------------
    // Renders
    // -----------------------
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
            <div className="max-w-5xl mx-auto px-6 py-10">
                <Link to="/tools" className="text-blue-600 hover:underline">
                    ← Back to tools
                </Link>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-10 gap-6">
                    {/* LEFT */}
                    <div className="lg:col-span-6">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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

                                <div className="absolute top-4 left-4 flex items-center gap-2">
                                    <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-xs font-semibold">
                                        ${tool.price_per_day} / day
                                    </span>
                                    <AvailabilityPill />
                                </div>
                            </div>

                            <div className="p-6">
                                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                                    {tool.name}
                                </h1>

                                <p className="text-gray-600 mt-2 text-sm leading-relaxed">
                                    {tool.description || "No description provided."}
                                </p>

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

                        {/* ✅ REVIEWS SECTION */}
                        <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-gray-900">Reviews</h2>

                                <div className="text-sm text-gray-700">
                                    <span className="font-semibold">
                                        {Number(avgRating || 0).toFixed(1)}
                                    </span>{" "}
                                    / 5
                                    <span className="text-gray-400"> ({reviewCount})</span>
                                </div>
                            </div>

                            {canReview ? (
                                <div className="mt-4 border rounded-xl p-4 bg-gray-50">
                                    <p className="text-sm font-semibold text-gray-900 mb-2">
                                        Leave a review
                                    </p>

                                    <label className="block text-sm text-gray-700 mb-1">
                                        Rating
                                    </label>
                                    <select
                                        value={myRating}
                                        onChange={(e) => setMyRating(Number(e.target.value))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-white"
                                    >
                                        <option value={5}>5 - Excellent</option>
                                        <option value={4}>4 - Good</option>
                                        <option value={3}>3 - Okay</option>
                                        <option value={2}>2 - Bad</option>
                                        <option value={1}>1 - Terrible</option>
                                    </select>

                                    <label className="block text-sm text-gray-700 mt-3 mb-1">
                                        Comment
                                    </label>
                                    <textarea
                                        value={myComment}
                                        onChange={(e) => setMyComment(e.target.value)}
                                        rows={3}
                                        placeholder="Write your feedback..."
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-white"
                                    />

                                    <button
                                        disabled={submittingReview}
                                        onClick={submitReview}
                                        className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-60"
                                    >
                                        {submittingReview ? "Submitting..." : "Submit Review"}
                                    </button>
                                </div>
                            ) : (
                                <p className="mt-3 text-sm text-gray-500">
                                    You can review only after the rental is completed (returned +
                                    confirmed).
                                </p>
                            )}

                            <div className="mt-5">
                                {reviewLoading ? (
                                    <p className="text-sm text-gray-500">Loading reviews...</p>
                                ) : reviews.length === 0 ? (
                                    <p className="text-sm text-gray-500">No reviews yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {reviews.map((r) => (
                                            <div
                                                key={r.id}
                                                className="border border-gray-200 rounded-xl p-4"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {r.reviewer_name}
                                                    </p>
                                                    <p className="text-sm text-gray-700">{r.rating} / 5</p>
                                                </div>
                                                {r.comment && (
                                                    <p className="text-sm text-gray-600 mt-2">
                                                        {r.comment}
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-400 mt-2">
                                                    {String(r.created_at).slice(0, 10)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
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

                                    <AvailabilityPill />
                                </div>

                                <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-4">
                                    <p className="text-xs text-gray-500">What happens next?</p>
                                    <p className="text-sm text-gray-700 mt-1">
                                        Choose dates → Send request → Owner approves
                                    </p>
                                </div>

                                <button
                                    onClick={openModal}
                                    disabled={!tool.available}
                                    className={`mt-5 w-full py-3 rounded-xl font-semibold transition ${tool.available
                                            ? "bg-blue-600 text-white hover:bg-blue-700"
                                            : "bg-gray-400 text-white cursor-not-allowed"
                                        }`}
                                >
                                    {tool.available ? "Rent this tool" : "Unavailable"}
                                </button>

                                <p className="text-xs text-gray-500 mt-3">
                                    You won’t be charged until the owner approves.
                                </p>

                                {/* OWNER CONTROLS */}
                                {isOwner && (
                                    <div className="mt-5 border-t pt-4">
                                        <p className="text-sm font-bold text-gray-900 mb-3">
                                            Owner controls
                                        </p>

                                        <div className="flex flex-col gap-2">
                                            <Link
                                                to={`/tools/${tool.id}/edit`}
                                                className="w-full text-center bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition"
                                            >
                                                Edit Tool
                                            </Link>

                                            <button
                                                onClick={handleToggleAvailability}
                                                className="w-full border border-gray-200 text-gray-800 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition"
                                            >
                                                {tool.available ? "Mark Unavailable" : "Mark Available"}
                                            </button>

                                            <button
                                                onClick={handleDeleteTool}
                                                className="w-full bg-red-600 text-white py-2.5 rounded-xl font-semibold hover:bg-red-700 transition"
                                            >
                                                Delete Tool
                                            </button>
                                        </div>
                                    </div>
                                )}
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
