const crypto = require('crypto');

function generateJWTSecret() {
    return crypto.randomBytes(32).toString('hex');
}

function tryCatch(routeHandler) {
    return async function (req, res, next) {
        try {
            await routeHandler(req, res);
        }
        catch (error) {
            return next(error);
        }
    }
}

function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

module.exports = {
    generateJWTSecret,
    tryCatch,
    sleep
}