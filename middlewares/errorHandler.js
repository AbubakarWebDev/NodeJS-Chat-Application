const multer = require('multer');
const jwt = require('jsonwebtoken');
const debug = require('debug')('app:debug');

const AppError = require("../utils/AppError");
const { error, validation } = require('../utils/apiResponse');

const { EMAIL_ERROR } = require("../constants/errorCodes");

module.exports = function (err, req, res, next) {
    // Log the error to the console for debugging
    debug(err);

    // Handle syntax error thrown by body-parser middleware
    if (err instanceof SyntaxError) {
        return res.status(400).json(error(
            "Invalid JSON data in request body",
            res.statusCode,
        ));
    }

    // Handle errors related to JWT token verification
    if (err instanceof jwt.JsonWebTokenError) {
        return res.status(401).json(error(
            'Unauthorized: Invalid token',
            res.statusCode,
        ));
    }

    // Handle file upload error thrown by Multer middleware
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json(error(
                `File ${err.field} upload exceeds the maximum file size limit!`,
                400,
            ));
        }
    }

    // Handle custom application errors
    if (err instanceof AppError) {
        // Handle validation errors thrown by the route handlers
        if (err.statusCode === 422) {
            return res.status(err.statusCode).json(validation(err.errors));
        }

        // Handle other application errors with non-500 status codes
        if (err.statusCode !== 500) {
            return res.status(err.statusCode).json(error(err.message, res.statusCode));
        }
    }

    if (err.code === 'ENOENT') {
        // The file or directory does not exist
        return res.status(500).json(error(
            "Something Went Wrong!",
            res.statusCode,
            EMAIL_ERROR
        ));
    }

    // Handle uncaught errors with a 500 status code and generic error message
    return res.status(500).json(error(
        "Something Went Wrong!",
        res.statusCode,
        err.errorCode
    ));
}