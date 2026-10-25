import { Schema, model } from "mongoose";

const potteryRequestSchema = new Schema({
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    artist: { type: Schema.Types.ObjectId, ref: "User", required: true },
    item: { type: String, required: true },
    glaze: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, max: 12 },
    neededByDate: { type: Date, required: true },
    price: { type: Number },
    designImage: { type: String }, // <-- NEW
    status: {
        type: String,
        enum: ['requested', 'confirmed', 'accepted', 'declined', 'cancelled'],
        default: 'requested'
    }
});

export const potteryRequestModel = model("PotteryRequest", potteryRequestSchema);