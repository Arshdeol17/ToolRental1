import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function Tools() {
    const [tools, setTools] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI state
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("All");
    const [sort, setSort] = useState("newest"); // newest | price_asc | price_desc | name_asc

    useEffect(() => {
        fetch("http://localhost:5000/api/tools")
            .then((res) => res.json())
            .then((data) => {
                setTools(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setTools([]);
                setLoading(false);
            });
    }, []);

    const categories = useMemo(() => {
        const set = new Set(
            tools
                .map((t) => (t.category || "").trim())
                .filter(Boolean)
                .map((c) => c.toLowerCase())
        );
        return ["All", ...Array.from(set).sort()];
    }, [tools]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        let list = tools.filter((t) => {
            const matchesQuery =
                !q ||
                (t.name || "").toLowerCase().includes(q) ||
                (t.description || "").toLowerCase().includes(q) ||
                (t.category || "").toLowerCase().includes(q) ||
                (t.owner_name || "").toLowerCase().includes(q);

            const matchesCategory =
                category === "All" ||
                (t.category || "").trim().toLowerCase() === category;

            return matchesQuery && matchesCategory;
        });

        if (sort === "price_asc") {
            list = list.sort(
                (a, b) => Number(a.price_per_day) - Number(b.price_per_day)
            );
        } else if (sort === "price_desc") {
            list = list.sort(
                (a, b) => Number(b.price_per_day) - Number(a.price_per_day)
            );
        } else if (sort === "name_asc") {
            list = list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        } else {
            list = list.sort(
                (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
            );
        }

        return list;
    }, [tools, query, category, sort]);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-6 py-10">
                {/* ✅ Header row with Add Tool */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                            Browse Tools
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm">
                            Search tools, compare prices, and request a rental.
                        </p>
                    </div>

                    <Link
                        to="/tools/add"
                        className="
              inline-flex items-center gap-2
              bg-blue-600 text-white
              px-5 py-2.5
              rounded-xl
              font-semibold
              shadow-sm
              hover:bg-blue-700
              transition
            "
                    >
                        <span className="text-lg leading-none">+</span>
                        Add Tool
                    </Link>
                </div>

                {/* Modern toolbar (no add button here now) */}
                <div className="bg-white/80 backdrop-blur border border-gray-200 rounded-2xl shadow-sm p-4 mb-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                        {/* Search */}
                        <div className="lg:col-span-6">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Search
                            </label>
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by tool, category, owner..."
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                            />
                        </div>

                        {/* Category */}
                        <div className="lg:col-span-3">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Category
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                {categories.map((c) => (
                                    <option key={c} value={c}>
                                        {c === "All" ? "All categories" : c}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Sort */}
                        <div className="lg:col-span-3">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Sort
                            </label>
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                <option value="newest">Newest</option>
                                <option value="price_asc">Price: low → high</option>
                                <option value="price_desc">Price: high → low</option>
                                <option value="name_asc">Name: A → Z</option>
                            </select>
                        </div>
                    </div>

                    {/* Results row */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                        <p className="text-sm text-gray-600">
                            {loading ? (
                                "Loading tools..."
                            ) : (
                                <>
                                    Showing{" "}
                                    <span className="font-semibold text-gray-900">
                                        {filtered.length}
                                    </span>{" "}
                                    tool{filtered.length === 1 ? "" : "s"}
                                </>
                            )}
                        </p>

                        {(query || category !== "All") && (
                            <button
                                onClick={() => {
                                    setQuery("");
                                    setCategory("All");
                                    setSort("newest");
                                }}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                {!loading && filtered.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900">No tools found</h2>
                        <p className="text-gray-600 mt-1">
                            Try a different search or category.
                        </p>
                        <Link
                            to="/tools/add"
                            className="inline-block mt-4 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition font-semibold"
                        >
                            Add the first tool
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filtered.map((tool) => (
                            <Link
                                key={tool.id}
                                to={`/tools/${tool.id}`}
                                className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden"
                            >
                                {/* Image */}
                                <div className="relative">
                                    {tool.image_url ? (
                                        <img
                                            src={`http://localhost:5000${tool.image_url}`}
                                            alt={tool.name}
                                            className="h-40 w-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-500">
                                            No Image
                                        </div>
                                    )}

                                    {/* ✅ Modern Price badge */}
                                    <div
                                        className="
                      absolute top-3 left-3
                      bg-blue-50 text-blue-700
                      px-3 py-1
                      rounded-full
                      text-xs font-semibold
                      border border-blue-100
                    "
                                    >
                                        ${tool.price_per_day} / day
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-4">
                                    <h2 className="font-semibold text-[15px] text-gray-900 leading-snug group-hover:text-blue-700 transition">
                                        {tool.name}
                                    </h2>

                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                        {tool.description || "No description"}
                                    </p>

                                    <div className="mt-3 flex items-center justify-between">
                                        {/* ✅ Modern category pill */}
                                        <span className="text-[11px] text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
                                            {tool.category || "Uncategorized"}
                                        </span>

                                        <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition">
                                            View →
                                        </span>
                                    </div>

                                    {tool.owner_name && (
                                        <p className="text-xs text-gray-400 mt-3">
                                            by{" "}
                                            <span className="font-medium text-gray-600">
                                                {tool.owner_name}
                                            </span>
                                        </p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
