import exp from "express";
import { wallBookingModel } from "../models/wallBookingModel.js";
import { verifyToken } from "../middlewares/tokenVerificationMiddleware.js";
import { allowedRoles } from "../middlewares/allowedRolesMiddleware.js";

export const wallBookingRouter = exp.Router();

// 1. CREATE A WALL BOOKING (Customer Only)
wallBookingRouter.post("/", verifyToken, allowedRoles(["customer"]), async (req, res, next) => {
    try {
        const { date, size, address } = req.body;
        const customerId = req.user.id;

        if (!date || !size || !address) {
            return res.status(400).json({ success: false, message: "Date, wall size, and address are required" });
        }

        // Validate wall size (10 to 500 sq ft)
        if (size < 10 || size > 500) {
            return res.status(400).json({ success: false, message: "Wall size must be between 10 and 500 sq ft" });
        }

        // Validate date: must be 7 to 90 days away
        const bookingDate = new Date(date);
        const today = new Date();
        const diffTime = bookingDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 7 || diffDays > 90) {
            return res.status(400).json({ success: false, message: "Wall booking date must be between 7 and 90 days away" });
        }

        // Calculate price (e.g., rate of 50 per sq ft)
        const ratePerSqFt = 150;
        const price = size * ratePerSqFt;

        const newBooking = await wallBookingModel.create({
            customer: customerId,
            date: bookingDate,
            size,
            address,
            price,
            status: "requested"
        });

        res.status(201).json({ success: true, message: "Wall booking requested successfully", booking: newBooking });
    } catch (err) {
        // Handle MongoDB duplicate key error for unique date
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: "This date has just been taken. Please choose another date." });
        }
        next(err);
    }
});

// 2. GET WALL BOOKINGS (Customer sees own, Admin sees all)
wallBookingRouter.get("/", verifyToken, async (req, res, next) => {
    try {
        let bookings;
        if (req.user.role === "admin") {
            bookings = await wallBookingModel.find({}).populate("customer", "username fullName");
        } else {
            bookings = await wallBookingModel.find({ customer: req.user.id });
        }
        res.status(200).json({ success: true, bookings });
    } catch (err) {
        next(err);
    }
});

// 3. CONFIRM OR DECLINE BOOKING (Admin Only)
// CONFIRM OR DECLINE BOOKING (Artist/Admin Only)
wallBookingRouter.patch("/:id/status", verifyToken, allowedRoles(["admin"]), async (req, res, next) => {
    try {
        const { status } = req.body; // Expects 'confirmed' or 'declined'
        if (!["confirmed", "declined"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Use 'confirmed' or 'declined'"
            });
        }

        const booking = await wallBookingModel.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        booking.status = status;
        await booking.save();

        res.status(200).json({
            success: true,
            message: `Booking status updated to ${status}`,
            booking
        });
    } catch (err) {
        next(err);
    }
});

// 4. CANCEL BOOKING (Customer Only - until 3 days before date)
wallBookingRouter.post("/:id/cancel", verifyToken, allowedRoles(["customer"]), async (req, res, next) => {
    try {
        const booking = await wallBookingModel.findOne({ _id: req.params.id, customer: req.user.id });
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found or unauthorized" });
        }

        // Check cancellation rule: up until 3 days before the date
        const bookingDate = new Date(booking.date);
        const today = new Date();
        const diffTime = bookingDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 3) {
            return res.status(400).json({ success: false, message: "Bookings can only be cancelled up until 3 days before the date." });
        }

        booking.status = "cancelled";
        await booking.save();

        res.status(200).json({ success: true, message: "Wall booking cancelled successfully", booking });
    } catch (err) {
        next(err);
    }
});
