import { Schema, model } from "mongoose";

const userSchema = new Schema({
    username: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['customer', 'admin', 'studio'], default: 'customer' }
});

export const userModel = model("User", userSchema);