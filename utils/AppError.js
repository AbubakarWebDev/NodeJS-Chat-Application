class AppError extends Error {
    constructor(message, statusCode, validationErrors = [], errorCode = 0) {
        super(message);

        this.statusCode = statusCode;
        this.errors = validationErrors
        this.errorCode = errorCode;
    }
}

module.exports = AppError;