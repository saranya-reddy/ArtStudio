export const allowedRoles = (...roles) => {
    const flatRoles = roles.flat();
    return (req, res, next) => {
        if (!flatRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: "You are not authorized to access this feature" });
        }
        next();
    };
};