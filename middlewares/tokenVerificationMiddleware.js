import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    try {
        let token = null;

        // 1. Check Authorization header first (Format: "Bearer <token>")
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }

        // 2. Fallback to checking cookies if header is missing
        if (!token && req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Please relogin to continue (Token missing)"
            });
        }

        // 3. Verify token using JWT secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach decoded user payload to request object
        req.user = decoded;
        next();
    } catch (err) {
        console.error("JWT Verification Error:", err.message);
        return res.status(403).json({
            success: false,
            message: "Invalid or expired token. Please relogin."
        });
    }
};