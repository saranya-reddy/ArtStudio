import exp from "express";
import { potteryRequestModel } from "../models/potteryRequestModel.js";
import { verifyToken } from "../middlewares/tokenVerificationMiddleware.js";
import { allowedRoles } from "../middlewares/allowedRolesMiddleware.js";
import { userModel } from "../models/userModel.js";
import mongoose from "mongoose";

export const potteryRequestRouter = exp.Router();

// 1. CREATE A POTTERY REQUEST (Customer Only)
potteryRequestRouter.post("/", verifyToken, allowedRoles(["customer"]), async (req, res, next) => {
    try {
        const { artist, item, glaze, quantity, neededByDate } = req.body;
        const customerId = req.user.id;

        if (!artist || !item || !glaze || !quantity || !neededByDate) {
            return res.status(400).json({ success: false, message: "Artist, item, glaze, quantity, and needed-by date are required" });
        }

        if (quantity < 1 || quantity > 12) {
            return res.status(400).json({ success: false, message: "Quantity must be between 1 and 12" });
        }

        const neededDate = new Date(neededByDate);
        const today = new Date();
        const diffTime = neededDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 14) {
            return res.status(400).json({ success: false, message: "Needed-by date must be at least 14 days away" });
        }

        // Resolve artist name string to User ObjectId
        let artistObjectId = artist;
        if (!mongoose.Types.ObjectId.isValid(artist)) {
            const artistUser = await userModel.findOne({
                $or: [{ fullName: artist }, { username: artist }]
            });
            if (!artistUser) {
                return res.status(404).json({ success: false, message: "Selected artist not found in system" });
            }
            artistObjectId = artistUser._id;
        }

        const newRequest = await potteryRequestModel.create({
            customer: customerId,
            artist: artistObjectId,
            item,
            glaze,
            quantity,
            neededByDate: neededDate,
            status: "requested"
        });

        res.status(201).json({ success: true, message: "Pottery request created successfully", request: newRequest });
    } catch (err) {
        next(err);
    }
});

// 2. GET ARTIST-SPECIFIC POTTERY TASKS (Admin/Artist Only)
potteryRequestRouter.get("/artist/tasks", verifyToken, allowedRoles(["admin"]), async (req, res, next) => {
    try {
        const artistId = req.user.id;
        const potteryRequests = await potteryRequestModel.find({ artist: artistId })
            .populate("customer", "username fullName");

        res.status(200).json({ success: true, potteryRequests });
    } catch (err) {
        next(err);
    }
});

// 3. GET POTTERY REQUESTS (Customer sees own, Admin sees all)
potteryRequestRouter.get("/", verifyToken, async (req, res, next) => {
    try {
        let requests;
        if (req.user.role === "admin") {
            requests = await potteryRequestModel.find({})
                .populate("customer", "username fullName")
                .populate("artist", "username fullName");
        } else {
            requests = await potteryRequestModel.find({ customer: req.user.id })
                .populate("artist", "username fullName");
        }
        res.status(200).json({ success: true, requests });
    } catch (err) {
        next(err);
    }
});

// 4. ACCEPT OR DECLINE POTTERY REQUEST (Artist/Admin Only)
potteryRequestRouter.patch("/:id/status", verifyToken, allowedRoles(["admin"]), async (req, res, next) => {
    try {
        const { status } = req.body; // 'confirmed', 'accepted' or 'declined'
        if (!["confirmed", "accepted", "declined"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status. Use 'confirmed', 'accepted' or 'declined'" });
        }

        const request = await potteryRequestModel.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: "Pottery request not found" });
        }

        request.status = status;
        await request.save();

        res.status(200).json({ success: true, message: `Pottery request status updated to ${status}`, request });
    } catch (err) {
        next(err);
    }
});

// 5. CANCEL POTTERY REQUEST (Customer Only)
potteryRequestRouter.post("/:id/cancel", verifyToken, allowedRoles(["customer"]), async (req, res, next) => {
    try {
        const request = await potteryRequestModel.findOne({ _id: req.params.id, customer: req.user.id });
        if (!request) {
            return res.status(404).json({ success: false, message: "Pottery request not found or unauthorized" });
        }

        if (request.status !== "requested") {
            return res.status(403).json({ success: false, message: "Can only cancel a request while its status is still 'requested'" });
        }

        request.status = "cancelled";
        await request.save();

        res.status(200).json({ success: true, message: "Pottery request cancelled successfully", request });
    } catch (err) {
        next(err);
    }
});