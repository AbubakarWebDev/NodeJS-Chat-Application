// Send any success response
const success = (message, statusCode, result) => {
    let respose = {
        message,
        error: false,
        code: statusCode,
    };

    if (result) respose.result = result

    return respose;
};

// Send any error response
const error = (message, statusCode, errorCode = 0) => {
    // List of common HTTP request code
    const codes = [
        200, // OK - The request was successful

        201, // Created - The request was successful and a resource was created

        400, // Bad Request - when the server cannot or will not process the request because the client has sent an invalid or incorrect request. (syntactically incorrect)

        401, // Unauthorized - Authentication failed or user does not have permissions for the requested operation

        404, // Not Found - The requested resource could not be found but may be available again in the future

        403, // Forbidden - Authentication succeeded, but authenticated user does not have access to the requested resource

        422, // Unprocessable Entity - it is used where the client has sent a well-formed request, but there are issues with the content of the request that prevent the server from processing it. (semantically incorrect)

        500  // Internal Server Error - An error occurred on the server
    ];

    // Get matched code
    const findCode = codes.find((code) => code == statusCode);

    statusCode = !findCode ? 500 : findCode;

    const error = {
        message,
        code: statusCode,
        error: true
    };

    if (errorCode) error.errorCode = errorCode

    return error;
};

// Send any validation error response
const validation = (errors) => {
    return {
        message: "Validation errors",
        error: true,
        code: 422,
        errors
    };
};

module.exports = {
    success,
    error,
    validation
}