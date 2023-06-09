const crypto = require('crypto');

function generateJWTSecret() {
    return crypto.randomBytes(32).toString('hex');
}

tryCatch = (controller) => async (req, res, next) => {
    try {
        await controller(req, res);
    } 
    catch (error) {
        return next(error);
    }
};

module.exports = {
    generateJWTSecret,
    tryCatch
}