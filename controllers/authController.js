const fs = require('fs');
const Joi = require('joi');
const bcrypt = require("bcrypt");
const multer  = require('multer');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const sendEmail = require('../utils/mail');
const AppError = require("../utils/AppError");
const { success } = require('../utils/apiResponse');

const { User, validate } = require("../models/User");
const { log } = require('console');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads');
    },

    filename: function (req, file, cb) {
        const fileName = file.originalname.split('.')[0];
        const fileExtension = file.originalname.split('.')[1];

        cb(null, `${fileName}-${Date.now()}.${fileExtension}`);
    }
});

const limits = {
    fileSize: 1 * 1000 * 1000,  // 1 MB
    files: 1,
};

const upload = multer({ storage, limits }).single('avatar');

const loginUser = async (req, res) => {
    // Joi Schema for input validation
    const schema = Joi.object({
        email: Joi.string().required().email(),
        password: Joi.string().min(8).max(1024).required()
    });

    // Validate request body with Joi schema
    const { error, value } = schema.validate(req.body);
    if (error) {
        throw new AppError(
            "Validation Errors",
            422,
            error.details.map(elem => ({ [elem.context.key]: elem.message }))
        );
    }

    // Check if user exists in database
    let user = await User.findOne({ email: value.email });
    if (!user) throw new AppError("Invalid email or password.", 400);

    // Validate user password
    const validPassword = await bcrypt.compare(value.password, user.password);
    if (!validPassword) throw new AppError("Invalid email or password.", 400);

    // Generate JWT token
    const token = await user.generateAuthToken();

    return res.status(200).json(success("LoggedInn successfully", 200, { token }));
}

const registerUser = async (req, res) => {
    console.log(req.body);

    // Validate request body with Joi schema
    const { error, value } = validate(req.body);
    if (error) {
        throw new AppError(
            "Validation Errors",
            422,
            error.details.map(elem => ({ [elem.context.key]: elem.message }))
        );
    }

    // Check if username already exists in database
    let checkUsername = await User.findOne({ username: value.username });
    if (checkUsername) throw new AppError("Username is already taken!", 400);

    // Check if user email already exists in database
    let checkEmail = await User.findOne({ email: value.email });
    if (checkEmail) throw new AppError("User email is already Registered!", 400);

    // Create new user in database
    let user = new User({
        username: value.username,
        firstName: value.firstName,
        lastName: value.lastName,
        email: value.email,
        password: value.password,
        avatar: req.file.path
    });

    // Hash password and save user to database
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    await user.save();

    return res.status(200).json(success("User created successfully", 200));
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
        throw new AppError(
            "Validation Errors",
            422,
            error.details.map(elem => ({ [elem.context.key]: elem.message }))
        );
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

const sendUserPasswordResetEmail = async (req, res) => {
    // Define Joi schema for input validation
    const schema = Joi.object({ email: Joi.string().email().required() });

    // Validate request body with Joi schema
    const { error, value } = schema.validate(req.body);
    if (error) {
        // If input validation fails, throw AppError with 422 status code and validation errors
        throw new AppError(
            "Validation Errors",
            422,
            error.details.map(elem => ({ [elem.context.key]: elem.message }))
        );
    }

    // Check if user email exists in database or not
    let user = await User.findOne({ email: value.email });
    if (!user) throw new AppError("The User with this email is not registered!", 400);

    const secret = user._id + process.env.JWT_SECRET_KEY;
    const token = jwt.sign({ email: user.email }, secret, { expiresIn: '15m' });
    const resetLink = `http://localhost:3000/api/v1/auth/reset-password/${user._id}/${token}`;

    const readFileAsync = promisify(fs.readFile);
    const template = await readFileAsync('email-templates/reset-password.html', 'utf8');

    const html = template.replace('{{resetLink}}', resetLink).replace('{{userName}}', user.username);
    await sendEmail(user.email, "Password Reset Request", html);

    return res.status(200).json(success(
        "Password Reset Email Send Successfully. please check your inbox!",
        200
    ));
}

const resetPassword = async (req, res) => {
    // Define Joi schema for input validation
    const schema = Joi.object({
        id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
        token: Joi.string().required().regex(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/),
        newPassword: Joi.string().min(8).max(1024).required(),
        confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
            'any.only': 'Passwords do not match',
        }),
    });

    // Validate request body with Joi schema
    const { error, value } = schema.validate(req.body);
    if (error) {
        // If input validation fails, throw AppError with 422 status code and validation errors
        throw new AppError(
            "Validation Errors",
            422,
            error.details.map(elem => ({ [elem.context.key]: elem.message }))
        );
    }

    // Retrieve the user from the database
    const user = await User.findById(value.id);
    if (!user) throw new AppError("User does not exist", 400);

    try {
        const secret = user._id + process.env.JWT_SECRET_KEY;
        var decoded = jwt.verify(value.token, secret);
    } 
    catch (error) {
        throw new AppError('Your Password Reset Link is Invalid', 400);
    }

    // Check if the token has expired
    if (decoded.exp <= Date.now() / 1000) throw new AppError('Your Password Reset Link is Expired', 400);

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(value.newPassword, salt);

    // update new hashed password in database
    const updatedUser = await User.findByIdAndUpdate(
        value.id,
        { password: newHashedPassword },
        { new: true }
    );
    if (!updatedUser) throw new AppError("Unable to Reset Account Password!", 400);

    return res.status(200).json(success("Account Password Reset Successfully", 200));
}

const getLoggedInUser = async (req, res) => {
    return res.status(200).json(success("Success", 200, { user: req.user }));
}

module.exports = {
    loginUser,
    registerUser,
    resetPassword,
    changePassword,
    getLoggedInUser,
    sendUserPasswordResetEmail,
};