import exp from "express";
import { paintingModel } from "../models/paintingModel.js";
import { wallBookingModel } from "../models/wallBookingModel.js";
import { potteryRequestModel } from "../models/potteryRequestModel.js";
import { userModel } from "../models/userModel.js";
import { verifyToken } from "../middlewares/tokenVerificationMiddleware.js";
import { allowedRoles } from "../middlewares/allowedRolesMiddleware.js";

export const paintingRouter = exp.Router();

// 1. GET ALL PAINTINGS (Accessible to both customer and admin)
paintingRouter.get("/viewItems", verifyToken, async (req, res, next) => {
    try {
        const paintings = await paintingModel.find({});
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

// 6. GET CUSTOMER PURCHASES
paintingRouter.get("/my-purchases", verifyToken, allowedRoles(["customer"]), async (req, res, next) => {
    try {
        const paintings = await paintingModel.find({ boughtBy: req.user.id });
        res.status(200).json({ success: true, paintings });
    } catch (err) {
        next(err);
    }
});

// 7. ARTIST TASKS WORKSPACE (Filters for the logged-in artist)
paintingRouter.get("/artist/tasks", verifyToken, allowedRoles(["admin"]), async (req, res, next) => {
    try {
        const artistName = req.user.username;

        const paintings = await paintingModel.find({ artist: { $regex: new RegExp(artistName, "i") } });
        const wallBookings = await wallBookingModel.find({ artist: req.user.id });
        const potteryReqs = await potteryRequestModel.find({ artist: req.user.id });

        res.status(200).json({
            success: true,
            tasks: {
                paintings,
                wallBookings,
                potteryReqs
            }
        });
    } catch (err) {
        next(err);
    }
});

// 8. STUDIO DASHBOARD & WORKLOAD ANALYTICS
paintingRouter.get("/studio/dashboard", verifyToken, allowedRoles(["studio"]), async (req, res, next) => {
    try {
        const artists = await userModel.find({ role: "admin" });
        const allPaintings = await paintingModel.find({});
        const allWallBookings = await wallBookingModel.find({});
        const allPotteryRequests = await potteryRequestModel.find({});

        const artistWorkloads = await Promise.all(artists.map(async (artist) => {
            const artistIdStr = artist._id.toString();
            const artistName = (artist.fullName || artist.username || "").trim().toLowerCase();

            // 1. PAINTINGS: Match strictly using the artist's name string
            const artistPaintings = allPaintings.filter(p => {
                if (!p || !p.artist) return false;
                return String(p.artist).trim().toLowerCase() === artistName;
            });
            const soldPaintings = artistPaintings.filter(p => !p.isAvailable || p.status === 'sold').length;

            // 2. WALL MURALS: Match strictly using Artist ObjectId reference
            const murals = allWallBookings.filter(w => {
                if (!w || !w.artist) return false;
                return w.artist.toString() === artistIdStr;
            });

            // 3. POTTERY REQUESTS: Match strictly using Artist ObjectId reference
            const pottery = allPotteryRequests.filter(r => {
                if (!r || !r.artist) return false;
                return r.artist.toString() === artistIdStr;
            });

            return {
                artistId: artist._id,
                artistName: artist.fullName || artist.username,
                paintingsTotal: artistPaintings.length,
                paintingsSold: soldPaintings,
                muralsReceived: murals.length,
                muralsAccepted: murals.filter(w => w.status === "confirmed" || w.status === "accepted").length,
                muralsDeclined: murals.filter(w => w.status === "declined").length,
                potteryReceived: pottery.length,
                potteryAccepted: pottery.filter(r => r.status === "confirmed" || r.status === "accepted").length,
                potteryDeclined: pottery.filter(r => r.status === "declined").length,
            };
        }));

        res.status(200).json({
            success: true,
            artistWorkloads,
            allPaintings
        });
    } catch (err) {
        next(err);
    }
});