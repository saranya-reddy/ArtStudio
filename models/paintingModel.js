import { Schema, model } from "mongoose";

const paintingSchema = new Schema({
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    artist: { type: String, required: true },
    paintingImage: { type: String, required: true },
    price: { type: Number, required: true },
    descriptions: { type: String },
    status: { type: String, enum: ['available', 'sold'], default: 'available' },
    isAvailable: { type: Boolean, default: true },
    boughtBy: { type: Schema.Types.ObjectId, ref: "User", default: null }
});

export const paintingModel = model("Painting", paintingSchema);