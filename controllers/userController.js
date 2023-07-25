const Joi = require("joi");
const path = require("path");
const bcrypt = require("bcrypt");
const multer = require("multer");

const AppError = require("../utils/AppError");
const { success } = require("../utils/apiResponse");

const { User } = require("../models/User");

class UserController {
  /**
   * @route   GET /api/v1/users/:id
   * @desc    Check if a user exists by ID
   * @access  Public
   *
   * @param   {Object} req - Express request object.
   * @param   {Object} res - Express response object.
   *
   * @returns {void}
   */

  static async checkUserExists(req, res) {
    // Define Joi schema for params validation
    const schema = Joi.string()
      .label("User ID")
      .required()
      .regex(/^[0-9a-fA-F]{24}$/)
      .rule({ message: "{{#label}} is Invalid!" });

    // Validate request param with Joi schema
    const { error, value: userId } = schema.validate(req.params.id);
    if (error) {
      // If input validation fails, throw AppError with 422 status code and validation errors
      throw new AppError(error.details[0].message, 422);
    }

    // Check if user already exists in database or not
    let checkId = await User.findOne({ _id: userId });
    if (!checkId) throw new AppError("User Not Found", 404);

    return res.status(200).json(success("User exists", 200));
  }

  /**
   * @route   POST /api/v1/users/change-password
   * @desc    Change the password of the logged-in user
   * @access  Protected
   *
   * @param   {Object} req - Express request object.
   * @param   {Object} res - Express response object.
   *
   * @returns {void}
   */

  static async changePassword(req, res) {
    // Define Joi schema for input validation
    const schema = Joi.object({
      currentPassword: Joi.string().min(8).max(1024).required(),
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
    const user = await User.findById(req.user._id);
    if (!user) throw new AppError("User does not exist", 400);

    // Validate current user password by comparing with stored hash
    const validPassword = await bcrypt.compare(
      value.currentPassword,
      user.password
    );
    if (!validPassword) throw new AppError("Invalid Current Password.", 400);

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(value.newPassword, salt);

    // update new hashed password in database
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { password: newHashedPassword },
      { new: true }
    );
    if (!updatedUser)
      throw new AppError("Unable to Update Account Password!", 400);

    return res
      .status(200)
      .json(success("Account Password Updated Successfully", 200));
  }

  /**
   * @route   GET /api/v1/users/loggedin
   * @desc    Get the details of the logged-in user
   * @access  Protected
   *
   * @param   {Object} req - Express request object.
   * @param   {Object} res - Express response object.
   *
   * @returns {void}
   */

  static async getLoggedInUser(req, res) {
    return res.status(200).json(success("Success", 200, { user: req.user }));
  }

  /**
   * @route   GET /api/v1/users
   * @desc    Get all users except the logged-in user
   * @access  Protected
   *
   * @param   {Object} req - Express request object.
   * @param   {Object} res - Express response object.
   *
   * @returns {void}
   */

  static async getAllUsers(req, res) {
    let filter = req.query.search
      ? {
        $or: [
          { username: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
        _id: { $ne: req.user._id },
      }
      : {
        _id: { $ne: req.user._id },
      };

    const users = await User.find(filter).select("-password -__v");

    return res.status(200).json(success("Success", 200, { users }));
  }

  /**
   * @route   PUT /api/v1/users
   * @desc    Update the user profile data
   * @access  Protected
   *
   * @param   {Object} req - Express request object.
   * @param   {Object} res - Express response object.
   *
   * @returns {void}
   */

  static async updateUserProfile(req, res) {
    const schema = Joi.object({
      username: Joi.string().alphanum().min(4).max(25).required(),
      firstName: Joi.string().min(3).required().label("First Name"),
      lastName: Joi.string().min(3).required().label("Last Name"),
      email: Joi.string().email().required(),
    });

    // Validate request body with Joi schema
    const { error, value } = schema.validate(req.body);
    if (error) {
      // If input validation fails, throw AppError with 422 status code and validation errors
      throw new AppError(error.details[0].message, 422);
    }

    // Check if user exists in database excluding the current email
    let userEmail = await User.findOne({
      $and: [
        {
          email: { $ne: req.user.email }
        },
        {
          email: { $eq: value.email }
        },
      ]
    });
    if (userEmail) throw new AppError("Entered email is already exist on database.", 400);

    // Check if user exists in database excluding the current username
    let username = await User.findOne({
      $and: [
        {
          username: { $ne: req.user.username }
        },
        {
          username: { $eq: value.username }
        },
      ]
    });
    if (username) throw new AppError("Entered username is already exist on database.", 400);


    // update new user details in database
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        username: value.username,
        firstName: value.firstName,
        lastName: value.lastName,
        email: value.email
      },
      { new: true, select: "-password" }
    );

    return res.status(200).json(success("Success", 200, { user: updatedUser }));
  }


  /**
 * @route   PUT /api/v1/users/avatar
 * @desc    Update the user profile data
 * @access  Protected
 *
 * @param   {Object} req - Express request object.
 * @param   {Object} res - Express response object.
 *
 * @returns {void}
 */

  static async updateUserAvatar(req, res, next) {
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
      fileSize: 2 * 1000 * 1000, // 1 MB
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
          }
          else {
            throw err;
          }
        }
        else if (err instanceof AppError) {
          throw err;
        }

        if (!req.file) {
          throw new AppError("Avatar Image is Required!", 400);
        }

        const filePath = req.file.path.replaceAll("\\", "/");
        const newFilePath = filePath.replace("public/", "");

        const updatedUser = await User.findByIdAndUpdate(
          req.user._id,
          { avatar: newFilePath },
          { new: true, select: "-password" }
        );

        return res.status(200).json(success("Success", 200, { user: updatedUser }));
      }
      catch (err) {
        return next(err);
      }
    });
  }
}

module.exports = UserController;
