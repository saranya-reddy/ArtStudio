import exp from "express";
import { connect } from "mongoose";
import dotenv from 'dotenv';
import path from "path";
import { fileURLToPath } from "url";
// Import your routers from the APIs folder
import { authRouter } from "./APIs/authAPI.js";
import { paintingRouter } from "./APIs/paintingAPI.js";
import { wallBookingRouter } from "./APIs/wallBookingAPI.js";
import { potteryRequestRouter } from "./APIs/potteryRequestAPI.js";
import cookieParser from "cookie-parser";
import cors from "cors";

dotenv.config();

const app = exp();
app.use(cors({
    origin: "http://localhost:2500", // Your frontend origin/port
    credentials: true                // CRITICAL: Allows cookies to be sent/received across requests
}));
app.use(exp.json());
app.use(cookieParser());

// Mount Routes
app.use("/api/auth", authRouter);
app.use("/api/paintings", paintingRouter);
app.use("/api/wall-bookings", wallBookingRouter);
app.use("/api/pottery-requests", potteryRequestRouter);

async function connectDB() {
    try {
        await connect(process.env.DB_URL);
        console.log("DB Connected");
        app.listen(process.env.PORT, () => console.log(`Server listening on port ${process.env.PORT}..`));
    } catch (err) {
        console.log("Err in DB connect:", err);
    }
}

connectDB();

// Global Error Handler
app.use((err, req, res, next) => {
    console.log("Err is", err);
    res.status(err.status || 500).json({ success: false, message: err.message });
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve images folder statically
app.use("/images", exp.static(path.join(__dirname, "images")));

// Serve index.html
app.use(exp.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});