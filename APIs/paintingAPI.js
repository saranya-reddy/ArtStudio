import exp from "express";
import { paintingModel } from "../models/paintingModel.js";
import { verifyToken } from "../middlewares/tokenVerificationMiddleware.js";
import { allowedRoles } from "../middlewares/allowedRolesMiddleware.js";

export const paintingRouter = exp.Router();

// 1. GET ALL PAINTINGS (Accessible to both customer and admin)
paintingRouter.get("/viewItems", verifyToken, async (req, res, next) => {
    try {
        // Fetch all paintings from database
        const paintings = await paintingModel.find({});

        // Return 200 with paintings array
        res.status(200).json({
            success: true,
            count: paintings.length,
            paintings
        });
    } catch (err) {
        next(err);
    }
});

// 2. ADD A PAINTING (Admin Only)
paintingRouter.post("/addPainting", verifyToken, allowedRoles(["admin"]), async (req, res, next) => {
    try {
        const { title, artist, paintingImage, price, descriptions, status } = req.body;

        if (!title || !artist || !paintingImage || !price) {
            return res.status(400).json({
                success: false,
                message: "Title, artist, painting image, and price are required"
            });
        }

        const isAvailableBool = status ? status === 'available' : true;

        const newPainting = await paintingModel.create({
            uploadedBy: req.user.id,
            title,
            artist,
            paintingImage,
            price,
            descriptions,
            status: status || 'available',
            isAvailable: isAvailableBool
        });

        res.status(201).json({
            success: true,
            message: "Painting added successfully",
            painting: newPainting
        });
    } catch (err) {
        next(err);
    }
});

// 3. EDIT A PAINTING (Admin Only, and ONLY while available)
paintingRouter.put("/editPainting/:id", verifyToken, allowedRoles(["admin"]), async (req, res, next) => {
    try {
        const paintingId = req.params.id;

        const painting = await paintingModel.findById(paintingId);
        if (!painting) {
            return res.status(404).json({ success: false, message: "Painting not found" });
        }
        if (!painting.isAvailable) {
            return res.status(403).json({
                success: false,
                message: "Cannot edit a painting that has already been bought"
            });
        }

        const updatedPainting = await paintingModel.findByIdAndUpdate(
            paintingId,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Painting updated successfully",
            painting: updatedPainting
        });
    } catch (err) {
        next(err);
    }
});

// 4. BUY A PAINTING (Customer Only - atomic update)
paintingRouter.post("/:id/buy", verifyToken, allowedRoles(["customer"]), async (req, res, next) => {
    try {
        const paintingId = req.params.id;
        const userId = req.user.id;

        const painting = await paintingModel.findOneAndUpdate(
            { _id: paintingId, isAvailable: true },
            { isAvailable: false, status: 'sold', boughtBy: userId },
            { new: true }
        );

        if (!painting) {
            return res.status(400).json({
                success: false,
                message: "Painting is unavailable or already sold!"
            });
        }

        res.status(200).json({
            success: true,
            message: "Painting bought successfully",
            painting
        });
    } catch (err) {
        next(err);
    }
});

// 5. CANCEL PAINTING ORDER (Customer Only - restores availability)
paintingRouter.post("/:id/cancel", verifyToken, allowedRoles(["customer"]), async (req, res, next) => {
    try {
        const paintingId = req.params.id;
        const userId = req.user.id;

        const painting = await paintingModel.findOne({ _id: paintingId, boughtBy: userId });
        if (!painting) {
            return res.status(404).json({
                success: false,
                message: "Order not found or you do not own this purchase"
            });
        }

        painting.isAvailable = true;
        painting.status = 'available';
        painting.boughtBy = null;
        await painting.save();

        res.status(200).json({
            success: true,
            message: "Order cancelled, painting is available again",
            painting
        });
    } catch (err) {
        next(err);
    }
});


// GET CUSTOMER PURCHASES
paintingRouter.get("/my-purchases", verifyToken, allowedRoles(["customer"]), async (req, res, next) => {
    try {
        const paintings = await paintingModel.find({ boughtBy: req.user.id });
        res.status(200).json({ success: true, paintings });
    } catch (err) {
        next(err);
    }
});

// ARTIST TASKS WORKSPACE
paintingRouter.get("/artist/tasks", verifyToken, allowedRoles(["admin"]), async (req, res, next) => {
    try {
        // Fetch wall bookings or pottery requests assigned to this artist
        const wallBookings = await wallBookingModel.find({});
        const potteryReqs = await potteryRequestModel.find({});

        const tasks = [
            ...wallBookings.map(b => ({ ...b.toObject(), type: 'Wall Mural' })),
            ...potteryReqs.map(p => ({ ...p.toObject(), type: 'Pottery' }))
        ];
        res.status(200).json({ success: true, tasks });
    } catch (err) {
        next(err);
    }
});

// STUDIO DASHBOARD & WORKLOAD ANALYTICS
paintingRouter.get("/studio/dashboard", verifyToken, allowedRoles(["studio"]), async (req, res, next) => {
    try {
        const paintings = await paintingModel.find({});
        const wallBookings = await wallBookingModel.find({}).populate("customer", "fullName");
        const potteryReqs = await potteryRequestModel.find({}).populate("customer", "fullName");

        // Calculate workload counts per artist based on paintings uploaded or assigned
        const artistMap = {};
        paintings.forEach(p => {
            const artist = p.artist || "Unknown Artist";
            artistMap[artist] = (artistMap[artist] || 0) + 1;
        });

        const artistWorkloads = Object.keys(artistMap).map(artistName => ({
            artistName,
            orderCount: artistMap[artistName]
        }));

        const allBookings = [
            ...wallBookings.map(b => ({ ...b.toObject(), serviceType: 'Wall Mural' })),
            ...potteryReqs.map(p => ({ ...p.toObject(), serviceType: 'Pottery Request' }))
        ];

        res.status(200).json({
            success: true,
            artistWorkloads,
            allBookings
        });
    } catch (err) {
        next(err);
    }
});