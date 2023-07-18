const Joi = require("joi");
const bcrypt = require("bcrypt");
const AppError = require("../utils/AppError");
const { success } = require("../utils/apiResponse");
const { User } = require("../models/User");

class UserController {
  constructor(req, res) {
    this.req = req;
    this.res = res;
  }

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

  async checkUserExists() {
    // Define Joi schema for params validation
    const schema = Joi.string()
      .label("User ID")
      .required()
      .regex(/^[0-9a-fA-F]{24}$/)
      .rule({ message: "{{#label}} is Invalid!" });

    // Validate request param with Joi schema
    const { error, value: userId } = schema.validate(this.req.params.id);
    if (error) {
      // If input validation fails, throw AppError with 422 status code and validation errors
      throw new AppError(error.details[0].message, 422);
    }

    // Check if user already exists in database or not
    let checkId = await User.findOne({ _id: userId });
    if (!checkId) throw new AppError("User Not Found", 404);

    return this.res.status(200).json(success("User exists", 200));
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

  async changePassword() {
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
    const { error, value } = schema.validate(this.req.body);
    if (error) {
      // If input validation fails, throw AppError with 422 status code and validation errors
      throw new AppError(error.details[0].message, 422);
    }

    // Retrieve the user from the database
    const user = await User.findById(this.req.user._id);
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
      this.req.user._id,
      { password: newHashedPassword },
      { new: true }
    );
    if (!updatedUser)
      throw new AppError("Unable to Update Account Password!", 400);

    return this.res
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

  async getLoggedInUser() {
    return this.res
      .status(200)
      .json(success("Success", 200, { user: this.req.user }));
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
  async getAllUsers() {
    let filter = this.req.query.search
      ? {
          $or: [
            { username: { $regex: this.req.query.search, $options: "i" } },
            { email: { $regex: this.req.query.search, $options: "i" } },
          ],
          _id: { $ne: this.req.user._id },
        }
      : {
          _id: { $ne: this.req.user._id },
        };

    const users = await User.find(filter).select("-password -__v");

    return this.res.status(200).json(success("Success", 200, { users }));
  }
}

module.exports = UserController;
