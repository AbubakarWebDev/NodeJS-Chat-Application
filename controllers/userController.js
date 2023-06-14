const Joi = require('joi');
const bcrypt = require("bcrypt");

const AppError = require("../utils/AppError");
const { success } = require('../utils/apiResponse');

const { User } = require("../models/User");

const checkUserExists = async (req, res) => {
    // Define Joi schema for params validation
    const schema = Joi.string().required().regex(/^[0-9a-fA-F]{24}$/).message("Invalid User Id!");

    // Validate request param with Joi schema
    const { error, value: userId } = schema.validate(req.params.id);
    if (error) {
        // If input validation fails, throw AppError with 422 status code and validation errors
        throw new AppError(error.details[0].message, 422);
    }

    // Check if user already exists in database or not
    let checkId = await User.findOne({ id: userId });
    if (!checkId) throw new AppError("User Not Found", 404);

    return res.status(200).json(success("User exists", 200));
}

const changePassword = async (req, res) => {
    // Define Joi schema for input validation
    const schema = Joi.object({
        currentPassword: Joi.string().min(8).max(1024).required(),
        newPassword: Joi.string().min(8).max(1024).required(),
        confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
            'any.only': 'Passwords do not match',
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
    const validPassword = await bcrypt.compare(value.currentPassword, user.password);
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
    if (!updatedUser) throw new AppError("Unable to Update Account Password!", 400);

    return res.status(200).json(success("Account Password Updated Successfully", 200));
}

const getLoggedInUser = async (req, res) => {
    return res.status(200).json(success("Success", 200, { user: req.user }));
}

module.exports = {
    changePassword,
    getLoggedInUser,
    checkUserExists
};