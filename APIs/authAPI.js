import exp from "express";
import { userModel } from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { hash, compare } from "bcryptjs";

export const authRouter = exp.Router();

// Register user
authRouter.post("/register", async (req, res, next) => {
    try {
        let userObj = req.body;
        if (!userObj?.password) {
            return res.status(400).json({ success: false, message: "Password is required" });
        }

        let userExist = await userModel.findOne({ username: userObj.username });
        if (userExist) {
            return res.status(400).json({ success: false, message: "Username already exists" });
        }

        // Default role to customer if not specified
        if (!userObj.role) {
            userObj.role = "customer";
        }

        let hashedPassword = await hash(userObj.password, 12);
        userObj.password = hashedPassword;

        await userModel.create(userObj);
        return res.status(201).json({ success: true, message: `${userObj.role} account created successfully` });
    } catch (err) {
        next(err);
    }
});

// Login user
authRouter.post("/login", async (req, res, next) => {
    try {
        let userObj = req.body;
        let userDoc = await userModel.findOne({ username: userObj.username });

        if (userDoc === null) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        let result = await compare(userObj.password, userDoc.password);
        if (result === false) {
            return res.status(401).json({ success: false, message: "Invalid password" });
        }

        let signedToken = jwt.sign(
            { id: userDoc._id, username: userDoc.username, role: userDoc.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.cookie("accessToken", signedToken, {
            httpOnly: true,
            secure: false,
            sameSite: "lax"
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token: signedToken,
            user: {
                id: userDoc._id,
                username: userDoc.username,
                role: userDoc.role
            }
        });
    } catch (err) {
        next(err);
    }
});

// Logout
authRouter.post("/logout", async (req, res, next) => {
    try {
        res.clearCookie("accessToken", {
            httpOnly: true,
            secure: false,
            sameSite: "lax"
        });
        return res.status(200).json({ success: true, message: "Logout successful" });
    } catch (err) {
        next(err);
    }
});