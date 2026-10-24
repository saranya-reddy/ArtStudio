import exp from "express";
import { potteryRequestModel } from "../models/potteryRequestModel.js";
import { verifyToken } from "../middlewares/tokenVerificationMiddleware.js";
import { allowedRoles } from "../middlewares/allowedRolesMiddleware.js";

export const potteryRequestRouter = exp.Router();

// 1. CREATE A POTTERY REQUEST (Customer Only)
potteryRequestRouter.post("/", verifyToken, allowedRoles(["customer"]), async (req, res, next) => {
    try {
        const { item, glaze, quantity, neededByDate } = req.body;
        const customerId = req.user.id;

        if (!item || !glaze || !quantity || !neededByDate) {
            return res.status(400).json({ success: false, message: "Item, glaze, quantity, and needed-by date are required" });
        }

        // Validate quantity (1 to 12)
        if (quantity < 1 || quantity > 12) {
            return res.status(400).json({ success: false, message: "Quantity must be between 1 and 12" });
        }

        // Validate needed-by date: at least 14 days away
        const neededDate = new Date(neededByDate);
        const today = new Date();
        const diffTime = neededDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 14) {
            return res.status(400).json({ success: false, message: "Needed-by date must be at least 14 days away" });
        }

        const newRequest = await potteryRequestModel.create({
            customer: customerId,
            item,
            glaze,
            quantity,
            neededByDate,
            status: "requested"
        });

        res.status(201).json({ success: true, message: "Pottery request created successfully", request: newRequest });
    } catch (err) {
        next(err);
    }
});

// 2. GET POTTERY REQUESTS (Customer sees own, Admin sees all)
potteryRequestRouter.get("/", verifyToken, async (req, res, next) => {
    try {
        let requests;
        if (req.user.role === "admin") {
            requests = await potteryRequestModel.find({}).populate("customer", "username fullName");
        } else {
            requests = await potteryRequestModel.find({ customer: req.user.id });
        }
        res.status(200).json({ success: true, requests });
    } catch (err) {
        next(err);
    }
});

// 3. EDIT POTTERY REQUEST (Customer Only - ONLY while status is still 'requested')
potteryRequestRouter.put("/:id", verifyToken, allowedRoles(["customer"]), async (req, res, next) => {
    try {
        const request = await potteryRequestModel.findOne({ _id: req.params.id, customer: req.user.id });
        if (!request) {
            return res.status(404).json({ success: false, message: "Pottery request not found or unauthorized" });
        }

        if (request.status !== "requested") {
            return res.status(403).json({ success: false, message: "Can only edit a request while its status is still 'requested'" });
        }

        const updatedRequest = await potteryRequestModel.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({ success: true, message: "Pottery request updated successfully", request: updatedRequest });
    } catch (err) {
        next(err);
    }
});

// 4. ACCEPT OR DECLINE POTTERY REQUEST (Admin Only)
potteryRequestRouter.patch("/:id/status", verifyToken, allowedRoles(["admin"]), async (req, res, next) => {
    try {
        const { status } = req.body; // 'accepted' or 'declined'
        if (!["accepted", "declined"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status. Use 'accepted' or 'declined'" });
        }

        const request = await potteryRequestModel.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: "Pottery request not found" });
        }

        request.status = status;
        await request.save();

        res.status(200).json({ success: true, message: `Pottery request ${status} successfully`, request });
    } catch (err) {
        next(err);
    }
});

// 5. CANCEL POTTERY REQUEST (Customer Only - ONLY while status is still 'requested')
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