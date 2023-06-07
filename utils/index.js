const crypto = require('crypto');

function generateJWTSecret() {
    return crypto.randomBytes(32).toString('hex');
}


module.exports = {
    generateJWTSecret
}