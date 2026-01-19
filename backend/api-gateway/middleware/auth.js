const admin = require("../firebase");

async function checkAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken; // { uid, email, name, picture, ... }
        next();
    } catch (error) {
        console.error("Auth Error:", error);
        res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
}

module.exports = checkAuth;
