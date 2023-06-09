const multer = require('multer');
const jwt = require('jsonwebtoken');
const debug = require('debug')('app:debug');

const AppError = require("../utils/AppError");
const { error, validation } = require('../utils/apiResponse');

module.exports = function (err, req, res, next) {
    // Log the error to the console for debugging
    debug(err);

    let statusCode = 500;
    let message = "Internal Server Error";

    // Handle syntax error thrown by body-parser middleware
    if (err instanceof SyntaxError) {
        statusCode = 400;
        message = "Invalid JSON data in request body";
    }

    // Handle errors related to JWT token verification
    else if (err instanceof jwt.JsonWebTokenError) {
        statusCode = 401;
        message = "Unauthorized: Invalid token";
    }

    // Handle file upload error thrown by Multer middleware
    else if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            statusCode = 400;
            message = `File ${err.field} upload exceeds the maximum file size limit!`;
        }
    }

    // Handle custom application errors
    if (err instanceof AppError) {
        // Handle validation errors thrown by the route handlers
        if (err.statusCode === 422) {
            return res.status(err.statusCode).json(validation(err.errors));
        }

        // Handle 400 errors thrown by the route handlers
        else if (err.statusCode === 400) {
            statusCode = err.statusCode;
            message = err.message;
        }

        // Handle other application errors with non-500 status codes
        else if (err.statusCode !== 500) {
            statusCode = err.statusCode;
            message = err.message;
        }
    }

    // Handle uncaught errors with a 500 status code and generic error message
    return res.status(500).json(error(
        message,
        statusCode,
        err.errorCode
    ));
}