import mongoose from "mongoose";

const toolSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        description: String,
        category: String,
        condition: String,
        price: {
            type: Number,
            required: true,
        },
        image: String,
    },
    { timestamps: true }
);

export default mongoose.model("Tool", toolSchema);
