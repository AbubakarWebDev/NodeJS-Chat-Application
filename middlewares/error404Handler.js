const { error } = require('../utils/apiResponse');

module.exports = function (req, res, next) {
    res.status(404).json(error(
        "The route you have requested is not found!",
        res.statusCode
    ));
};