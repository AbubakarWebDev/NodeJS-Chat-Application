const express = require('express');
const debug = require('debug')('app:debug');

require("express-async-errors");
require('dotenv').config();

const app = express();

require("./startup/logging")(debug);
require("./startup/config")(app);
require("./startup/db")();
require("./startup/middlewares")(app);
require("./startup/routers")(app);

app.listen(process.env.PORT, () => {
    debug(`Server running on http://localhost:${process.env.PORT}`);
});