const jwt = require('jsonwebtoken');

const { User } = require("../models/User");
const AppError = require("../utils/AppError");

const authenticateToken = async (req, res, next) => {
    // Extract token from Authorization header (if present)
    const token = req.headers.authorization?.replace('Bearer ', '');

    // If no token is present, throw an AppError with a 401 status code
    if (!token) throw new AppError('Unauthorized: Missing or invalid token', 401);

    // Verify the token using the secret key and get the decoded payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Check if the token has expired
    if (decoded.exp <= Date.now() / 1000) throw new AppError('Unauthorized: Token has expired', 401);

    // Find the user associated with the token in the database
    const user = await User.findOne({ _id: decoded._id }).select('-password');

    // If no user is found, throw an AppError with a 401 status code
    if (!user) throw new AppError('Unauthorized: User Not Found', 401);

    // Set the authenticated user and token in the request object
    req.user = user;
    req.token = token;

    // Call the next middleware in the chain
    next();
};

module.exports = authenticateToken;