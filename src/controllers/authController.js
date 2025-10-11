const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { User, Patient, PasswordResetToken } = require("../models");

/**
* Utility: Generate JWT token for a user
* ----------------------------------------------------
* - Encodes user ID, email, and role into the token
* - Uses a secret key (JWT_SECRET) from environment variables
* - Default expiration = 7 days (can be overridden with JWT_EXPIRES_IN)
*
* @param {Object} user - User instance
* @returns {string} JWT token
*/
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  );
};

/**
* Controller: Register a new user
* ----------------------------------------------------
* - Validates input (username, email, password required)
* - Hashing is handled by Sequelize model hook
* - Creates user and generates JWT for immediate login
*
* @route POST /api/auth/register
* @access Public
*/
const register = async (req, res) => {
 try {
   const { username, email, password, role } = req.body;

   const allowedRoles = ["admin", "manager", "staff", "doctor", "patient"];
   const normalizedRole = role || "patient";

   if (role && !allowedRoles.includes(role)) {
     return res.status(400).json({
       success: false,
       message: "Invalid role specified",
     });
   }

   // Validate required fields
   if (!username || !email || !password) {
     return res.status(400).json({
       success: false,
       message: "Username, email, and password are required",
     });
   }

   // Create new user in database
   // Role defaults to "staff" if not provided
   const user = await User.create({
     username,
     email,
     password,
     role: normalizedRole,
   });

   // Generate token for new user
   const token = generateToken(user);

   res.status(201).json({
     success: true,
     message: "User registered successfully",
     data: {
       user: user.toJSON(), // Removes password automatically
       token,
     },
   });
 } catch (error) {
   console.error("Registration error:", error);

   // Handle validation errors (e.g. invalid email format)
   if (error.name === "SequelizeValidationError") {
     const messages = error.errors.map((err) => err.message);
     return res.status(400).json({
       success: false,
       message: "Validation failed",
       errors: messages,
     });
   }

   // Handle duplicate username/email
   if (error.name === "SequelizeUniqueConstraintError") {
     const field = error.errors[0].path;
     return res.status(400).json({
       success: false,
       message: `${field} already exists`,
     });
   }

   // Generic server error
   res.status(500).json({
     success: false,
     message: "Internal server error",
   });
 }
};

/**
* Controller: Login user
* ----------------------------------------------------
 * - Validates input (email/username + password required)
 * - Finds user by email or username
* - Validates password with bcrypt
* - Returns JWT token on success
*
* @route POST /api/auth/login
* @access Public
*/
const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!password || (!email && !username)) {
      return res.status(400).json({
        success: false,
        message: "Email or username and password are required",
      });
    }

    const identifierClause = email && username
      ? { [Op.or]: [{ email }, { username }] }
      : email
      ? { email }
      : { username };

    const user = await User.findOne({
      where: identifierClause,
      attributes: [
        "id",
        "username",
        "email",
        "password",
        "role",
        "createdAt",
        "updatedAt",
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/username or password",
      });
    }

    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/username or password",
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
* Controller: Get Current User Profile
* ----------------------------------------------------
* - Uses `authenticateToken` middleware to set req.user
* - Returns the logged-in user's data (no password)
*
* @route GET /api/auth/profile
* @access Private
*/
const getProfile = async (req, res) => {
 try {
   const patientProfile =
     req.user.role === "patient"
       ? await Patient.findOne({ where: { userId: req.user.id } })
       : null;

   res.json({
     success: true,
     data: {
       user: req.user.toJSON(),
       ...(patientProfile && { patientProfile: patientProfile.toJSON() }),
     },
   });
 } catch (error) {
   console.error("Get profile error:", error);
   res.status(500).json({
     success: false,
     message: "Internal server error",
   });
 }
};

/**
 * Controller: Request password reset token
 * ----------------------------------------------------
 * - Accepts either an email or username to identify the account
 * - Generates a one-time reset token valid for 1 hour
 * - In a production system the token would be emailed; here we return it for demo purposes
 *
 * @route POST /api/auth/forgot-password
 * @access Public
 */
const requestPasswordReset = async (req, res) => {
 try {
   const { email, username } = req.body;

   if (!email && !username) {
     return res.status(400).json({
       success: false,
       message: "Please supply an email or username",
     });
   }

   const identifierClause = email && username
     ? { [Op.or]: [{ email }, { username }] }
     : email
     ? { email }
     : { username };

   const user = await User.findOne({ where: identifierClause });

   if (!user) {
     // Avoid leaking which identifier exists
     return res.json({
       success: true,
       message:
         "If the account exists, a password reset email has been sent.",
     });
   }

   await PasswordResetToken.update(
     { used: true },
     {
       where: {
         userId: user.id,
         used: false,
       },
     },
   );

   const rawToken = crypto.randomBytes(32).toString("hex");
   const hashedToken = crypto
     .createHash("sha256")
     .update(rawToken)
     .digest("hex");

   const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

   await PasswordResetToken.create({
     userId: user.id,
     token: hashedToken,
     expiresAt,
   });

   res.json({
     success: true,
     message:
       "If the account exists, a password reset email has been sent.",
     data: {
       resetToken: rawToken,
       expiresAt,
     },
   });
 } catch (error) {
   console.error("Forgot password error:", error);
   res.status(500).json({
     success: false,
     message: "Internal server error",
   });
 }
};

/**
 * Controller: Reset password using a token
 * ----------------------------------------------------
 * - Validates the provided token
 * - Updates the user's password and invalidates the token
 *
 * @route POST /api/auth/reset-password
 * @access Public
 */
const resetPassword = async (req, res) => {
 try {
   const { token, password } = req.body;

   if (!token || !password) {
     return res.status(400).json({
       success: false,
       message: "Token and new password are required",
     });
   }

   const hashedToken = crypto
     .createHash("sha256")
     .update(token)
     .digest("hex");

   const storedToken = await PasswordResetToken.findOne({
     where: {
       token: hashedToken,
       used: false,
       expiresAt: {
         [Op.gt]: new Date(),
       },
     },
   });

   if (!storedToken) {
     return res.status(400).json({
       success: false,
       message: "Reset token is invalid or has expired",
     });
   }

   const user = await User.findByPk(storedToken.userId);

   if (!user) {
     return res.status(404).json({
       success: false,
       message: "User associated with this token no longer exists",
     });
   }

   user.password = password;
   await user.save();

   storedToken.used = true;
   await storedToken.save();

   await PasswordResetToken.update(
     { used: true },
     {
       where: {
         userId: user.id,
         used: false,
         id: {
           [Op.ne]: storedToken.id,
         },
       },
     },
   );

   res.json({
     success: true,
     message: "Password reset successful",
   });
 } catch (error) {
   console.error("Reset password error:", error);
   res.status(500).json({
     success: false,
     message: "Internal server error",
   });
 }
};

module.exports = {
  register,
  login,
  getProfile,
  requestPasswordReset,
  resetPassword,
};

