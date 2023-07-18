const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const Joi = require("joi");
const bcrypt = require("bcrypt");
const multer = require("multer");
const jwt = require("jsonwebtoken");

const sendEmail = require("../utils/mail");
const AppError = require("../utils/AppError");
const { success } = require("../utils/apiResponse");

const { User, validate } = require("../models/User");

class AuthController {
  /**
   * @route   POST /api/v1/auth/login
   * @desc    Login a user
   * @access  Public
   *
   * @param   {Object} req - Express request object.
   * @param   {Object} res - Express response object.
   *
   * @returns {void}
   */

  static async loginUser(req, res) {
    // Joi Schema for input validation
    const schema = Joi.object({
      email: Joi.string().required().email(),
      password: Joi.string().min(8).max(1024).required(),
    });

    // Validate request body with Joi schema
    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 422);
    }

    // Check if user exists in database
    let user = await User.findOne({ email: value.email });
    if (!user) throw new AppError("Invalid email or password.", 400);

    // Validate user password
    const validPassword = await bcrypt.compare(value.password, user.password);
    if (!validPassword) throw new AppError("Invalid email or password.", 400);

    // Generate JWT token
    const token = await user.generateAuthToken();

    return res
      .status(200)
      .json(success("LoggedInn successfully", 200, { token }));
  }

  /**
   * @route   POST /api/v1/auth/register
   * @desc    Register a new user
   * @access  Public
   *
   * @param   {Object} req - Express request object.
   * @param   {Object} res - Express response object.
   * @param   {Function} next - Next middleware function.
   *
   * @returns {void}
   */

  static async registerUser(req, res, next) {
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, "public/uploads");
      },

      filename: function (req, file, cb) {
        const fileName = file.originalname.split(".")[0];
        const fileExtension = file.originalname.split(".")[1];

        cb(null, `${fileName}-${Date.now()}.${fileExtension}`);
      },
    });

    async function fileFilter(req, file, cb) {
      // Validate request body with Joi schema
      const { error, value } = validate(req.body);
      if (error) {
        return cb(new AppError(error.details[0].message, 422), false);
      }

      // Check if username already exists in database
      let checkUsername = await User.findOne({ username: value.username });
      if (checkUsername)
        return cb(new AppError("Username is already taken!", 400), false);

      // Check if user email already exists in database
      let checkEmail = await User.findOne({ email: value.email });
      if (checkEmail)
        return cb(
          new AppError("User email is already Registered!", 400),
          false
        );

      if (!file) {
        return cb(new AppError("Avatar Image is Required!", 400), false);
      }

      // Check if the file is an image with the allowed extensions
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const allowedExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

      const isImage = file.mimetype.startsWith("image/");
      const isAllowedExtension = allowedExtensions.includes(fileExtension);

      if (!isImage || !isAllowedExtension) {
        return cb(
          new AppError(
            "Invalid file type. Only image files (PNG, JPG, JPEG, GIF, and WebP) are allowed.",
            400
          ),
          false
        );
      }

      cb(null, true);
    }

    const limits = {
      fileSize: 1 * 1000 * 1000, // 1 MB
      files: 1,
    };

    const upload = multer({ storage, limits, fileFilter }).single("avatar");

    upload(req, res, async (err) => {
      try {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            throw new AppError(
              `File ${err.field} upload exceeds the maximum file size limit!`,
              400
            );
          } else {
            throw err;
          }
        } else if (err instanceof AppError) {
          throw err;
        }

        if (!req.file) {
          throw new AppError("Avatar Image is Required!", 400);
        }

        const filePath = req.file.path.replaceAll("\\", "/");
        const newFilePath = filePath.replace("public/", "");

        // Create new user in database
        let user = new User({
          username: req.body.username,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          email: req.body.email,
          password: req.body.password,
          avatar: newFilePath,
        });

        // Hash password and save user to database
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        await user.save();

        return res.status(200).json(success("User created successfully", 200));
      } catch (err) {
        return next(err);
      }
    });
  }

  /**
   * @route   POST /api/v1/auth/forgot-password
   * @desc    Send a password reset email to the user
   * @access  Public
   *
   * @param   {Object} req - Express request object.
   * @param   {Object} res - Express response object.
   *
   * @returns {void}
   */

  static async sendUserPasswordResetEmail(req, res) {
    // Define Joi schema for input validation
    const schema = Joi.object({ email: Joi.string().email().required() });

    // Validate request body with Joi schema
    const { error, value } = schema.validate(req.body);
    if (error) {
      // If input validation fails, throw AppError with 422 status code and validation errors
      throw new AppError(error.details[0].message, 422);
    }

    // Check if user email exists in database or not
    let user = await User.findOne({ email: value.email });
    if (!user)
      throw new AppError("The User with this email is not registered!", 400);

    const secret = user._id + process.env.JWT_SECRET_KEY;
    const token = jwt.sign({ email: user.email }, secret, { expiresIn: "15m" });
    const resetLink = `${process.env.FRONTEND_BASE_URL}/reset-password/${user._id}/${token}`;

    const readFileAsync = promisify(fs.readFile);
    const template = await readFileAsync(
      "email-templates/reset-password.html",
      "utf8"
    );

    const html = template
      .replace("{{resetLink}}", resetLink)
      .replace("{{userName}}", user.username);
    await sendEmail(user.email, "Password Reset Request", html);

    return res
      .status(200)
      .json(
        success(
          "Password Reset Email Send Successfully. please check your inbox!",
          200
        )
      );
  }

  /**
   * @route   POST /api/v1/auth/reset-password
   * @desc    Reset user password with a valid reset token
   * @access  Protected
   *
   * @param   {Object} req - Express request object.
   * @param   {Object} res - Express response object.
   *
   * @returns {void}
   */

  static async resetPassword(req, res) {
    // Define Joi schema for input validation
    const schema = Joi.object({
      id: Joi.string()
        .required()
        .regex(/^[0-9a-fA-F]{24}$/),
      token: Joi.string()
        .required()
        .regex(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/),
      newPassword: Joi.string().min(8).max(1024).required(),
      confirmNewPassword: Joi.string()
        .valid(Joi.ref("newPassword"))
        .required()
        .messages({
          "any.only": "Passwords do not match",
        }),
    });

    // Validate request body with Joi schema
    const { error, value } = schema.validate(req.body);
    if (error) {
      // If input validation fails, throw AppError with 422 status code and validation errors
      throw new AppError(error.details[0].message, 422);
    }

    // Retrieve the user from the database
    const user = await User.findById(value.id);
    if (!user) throw new AppError("User does not exist", 400);

    try {
      const secret = user._id + process.env.JWT_SECRET_KEY;
      var decoded = jwt.verify(value.token, secret);
    } catch (error) {
      throw new AppError("Your Password Reset Link is Invalid", 400);
    }

    // Check if the token has expired
    if (decoded.exp <= Date.now() / 1000)
      throw new AppError("Your Password Reset Link is Expired", 400);

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(value.newPassword, salt);

    // update new hashed password in database
    const updatedUser = await User.findByIdAndUpdate(
      value.id,
      { password: newHashedPassword },
      { new: true }
    );
    if (!updatedUser)
      throw new AppError("Unable to Reset Account Password!", 400);

    return res
      .status(200)
      .json(success("Account Password Reset Successfully", 200));
  }
}

module.exports = AuthController;
