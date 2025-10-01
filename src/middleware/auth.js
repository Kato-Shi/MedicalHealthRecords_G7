const jwt = require("jsonwebtoken"); // Import the jsonwebtoken library to handle JWT operations
const { User } = require("../models"); // Import the User model from Sequelize for database queries

/**
* Middleware to verify JWT tokens and authenticate users.
*
* This function ensures that a request has a valid JWT before allowing
* access to protected routes. It checks the Authorization header,
* verifies the token, and attaches the authenticated user to the request object.
*
* @function authenticateToken
* @param {Object} req - Express request object
* @param {Object} res - Express response object
* @param {Function} next - Express next middleware function
*/
const authenticateToken = async (req, res, next) => {
 try {
   // Extract the Authorization header (format: "Bearer <token>")
   const authHeader = req.headers["authorization"];

   // If the Authorization header exists, split it to get the token
   const token = authHeader && authHeader.split(" ")[1];

   // If no token is provided, return a 401 Unauthorized error
   if (!token) {
     return res.status(401).json({
       success: false,
       message: "Access token required", // Client must provide token
     });
   }

   // Verify the token using the secret key defined in environment variables
   const decoded = jwt.verify(token, process.env.JWT_SECRET);

   // Find the user from the database based on the decoded token's userId
   // We do not include password for security
   const user = await User.findByPk(decoded.userId);

   // If user is not found in database, return Unauthorized
   if (!user) {
     return res.status(401).json({
       success: false,
       message: "Invalid token - user not found",
     });
   }

   // Attach the user object to the request so it can be accessed in the next middleware/route
   req.user = user;

   // Call next() to pass control to the next middleware or route handler
   next();
 } catch (error) {
   // Log error for debugging purposes
   console.error("Auth middleware error:", error);

   // Handle specific JWT errors
   if (error.name === "JsonWebTokenError") {
     // Invalid token format or tampered token
     return res.status(401).json({
       success: false,
       message: "Invalid token",
     });
   }

   if (error.name === "TokenExpiredError") {
     // Token has expired and is no longer valid
     return res.status(401).json({
       success: false,
       message: "Token expired",
     });
   }

   // Catch-all error response for other unexpected issues
   res.status(500).json({
     success: false,
     message: "Authentication error",
   });
 }
};

// Export middleware so it can be used in routes
module.exports = { authenticateToken };

