import { Schema, model } from "mongoose";

const wallBookingSchema = new Schema({
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    artist: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    size: { type: Number, required: true, min: 10, max: 500 }, // sq ft
    address: { type: String, required: true },
    price: { type: Number, required: true },
    designImage: { type: String }, // <-- NEW
    status: {
        type: String,
        enum: ['requested', 'confirmed', 'declined', 'cancelled'],
        default: 'requested'
    }
});

export const wallBookingModel = model("WallBooking", wallBookingSchema);