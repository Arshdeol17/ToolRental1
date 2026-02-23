import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";

export default function EditTool() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        category: "",
        condition: "",
        price: "",
        image: null,
    });

    const [previewUrl, setPreviewUrl] = useState("");

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const res = await fetch(`http://localhost:5000/api/tools/${id}`);
                if (!res.ok) return alert("Tool not found");
                const t = await res.json();

                setFormData({
                    name: t.name || "",
                    description: t.description || "",
                    category: t.category || "",
                    condition: t.condition || "",
                    price: t.price_per_day || "",
                    image: null,
                });

                setPreviewUrl(t.image_url ? `http://localhost:5000${t.image_url}` : "");
            } catch {
                alert("Failed to load tool");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const handleChange = (e) => {
        const { name, value, files } = e.target;

        if (files && files[0]) {
            setFormData((p) => ({ ...p, [name]: files[0] }));
            setPreviewUrl(URL.createObjectURL(files[0]));
            return;
        }

        setFormData((p) => ({ ...p, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        if (!token) return alert("Please login first");

        try {
            setSaving(true);
            const data = new FormData();
            data.append("name", formData.name);
            data.append("description", formData.description);
            data.append("category", formData.category);
            data.append("condition", formData.condition);
            data.append("price", formData.price);

            if (formData.image) data.append("image", formData.image);

            const res = await fetch(`http://localhost:5000/api/tools/${id}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` },
                body: data,
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) return alert(json.message || "Failed to update");

            alert("✅ Tool updated!");
            navigate(`/tools/${id}`);
        } catch {
            alert("Failed to update tool");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto px-6 py-10">
                <p className="text-gray-600">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-3xl mx-auto px-6 py-10">
                <Link to={`/tools/${id}`} className="text-blue-600 hover:underline">
                    ← Back to tool
                </Link>

                <div className="mt-6 bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                    <h1 className="text-2xl font-extrabold text-gray-900">Edit Tool</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Update details and replace the image if needed.
                    </p>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        {/* Image preview */}
                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="w-full h-64 object-cover" />
                            ) : (
                                <div className="w-full h-64 bg-gray-100 flex items-center justify-center text-gray-500">
                                    No image
                                </div>
                            )}
                        </div>

                        <label className="block">
                            <span className="text-sm font-medium text-gray-700">Replace Image</span>
                            <input
                                type="file"
                                name="image"
                                accept="image/*"
                                className="mt-2 block w-full text-sm"
                                onChange={handleChange}
                            />
                        </label>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tool Name *</label>
                            <input
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea
                                name="description"
                                rows="4"
                                value={formData.description}
                                onChange={handleChange}
                                className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Category</label>
                                <input
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Condition</label>
                                <input
                                    name="condition"
                                    value={formData.condition}
                                    onChange={handleChange}
                                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Daily Price *</label>
                            <input
                                name="price"
                                type="number"
                                step="0.01"
                                required
                                value={formData.price}
                                onChange={handleChange}
                                className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        <button
                            disabled={saving}
                            className={`w-full py-3 rounded-xl font-semibold transition ${saving ? "bg-gray-400 text-white cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
                                }`}
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
