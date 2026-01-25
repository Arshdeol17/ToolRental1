import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AddTool() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        category: "",
        condition: "",
        price: "",
        image: null,
    });

    const [preview, setPreview] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e) => {
        const { name, value, files } = e.target;

        // If it's a file input
        if (files && files[0]) {
            const file = files[0];
            setFormData((prev) => ({ ...prev, [name]: file }));

            // preview
            const url = URL.createObjectURL(file);
            setPreview(url);
            return;
        }

        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSaving) return;

        setIsSaving(true);

        try {
            const data = new FormData();
            Object.keys(formData).forEach((key) => {
                // Avoid appending null image
                if (key === "image" && !formData.image) return;
                data.append(key, formData[key]);
            });

            const res = await fetch("http://localhost:5000/api/tools", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: data,
            });

            if (!res.ok) {
                let msg = "Failed to add tool";
                try {
                    const err = await res.json();
                    msg = err.message || err.error || msg;
                } catch { }
                alert(msg);
                return;
            }

            // ✅ Success: go back to tools list
            navigate("/tools");
        } catch (err) {
            alert(err.message || "Failed to add tool");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex justify-center items-start pt-20 px-4">
            <form
                onSubmit={handleSubmit}
                className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md"
            >
                <h2 className="text-2xl font-bold text-center mb-8">Add a Tool</h2>

                {/* TOOL NAME */}
                <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tool Name *
                    </label>
                    <input
                        name="name"
                        required
                        placeholder="e.g. Electric Drill"
                        className="w-full border rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        onChange={handleChange}
                    />
                </div>

                {/* DESCRIPTION */}
                <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                    </label>
                    <textarea
                        name="description"
                        rows="3"
                        placeholder="Short description of the tool"
                        className="w-full border rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        onChange={handleChange}
                    />
                </div>

                {/* CATEGORY */}
                <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                    </label>
                    <input
                        name="category"
                        placeholder="Construction, Gardening..."
                        className="w-full border rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        onChange={handleChange}
                    />
                </div>

                {/* CONDITION */}
                <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Condition
                    </label>
                    <input
                        name="condition"
                        placeholder="Good, Excellent..."
                        className="w-full border rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        onChange={handleChange}
                    />
                </div>

                {/* PRICE */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Daily Price *
                    </label>
                    <input
                        name="price"
                        type="number"
                        step="0.01"
                        required
                        placeholder="15.99"
                        className="w-full border rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        onChange={handleChange}
                    />
                </div>

                {/* IMAGE UPLOAD */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tool Image
                    </label>

                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg py-6 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                        <span className="text-blue-600 font-medium">
                            Click to upload an image
                        </span>
                        <span className="text-sm text-gray-500 mt-1">
                            PNG or JPG (max 5MB)
                        </span>

                        <input
                            type="file"
                            name="image"
                            accept="image/*"
                            className="hidden"
                            onChange={handleChange}
                        />
                    </label>

                    {/* ✅ Preview */}
                    {preview && (
                        <img
                            src={preview}
                            alt="Preview"
                            className="mt-4 w-full h-44 object-cover rounded-lg border"
                        />
                    )}
                </div>

                {/* SUBMIT BUTTON */}
                <button
                    type="submit"
                    disabled={isSaving}
                    className={`w-full py-3 rounded-md font-semibold transition ${isSaving
                            ? "bg-gray-400 text-white cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                >
                    {isSaving ? "Saving..." : "Save Tool"}
                </button>
            </form>
        </div>
    );
}
