const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');

module.exports = function(app) {
    // for secure express app by setting various HTTP headers.
    // https://www.securecoding.com/blog/using-helmetjs/
    app.use(helmet({ crossOriginResourcePolicy: false }));

    // for serve static files such as images, CSS files, and JavaScript files in a directory named 'public'
    app.use(express.static('public'));

    /*
    * for parse application/json
    * basically parse incoming Request Object as a JSON Object 
    */ 
    app.use(express.json());

    /*
    * for parse application/x-www-form-urlencoded
    * we can parse incoming Request Object if strings or arrays (when extended is false)
    * we can also parse (when extended is true) incoming Request Object 
    * if object, with nested objects, or generally any type
    */
    app.use(express.urlencoded({ extended: true }));

    // for enabling cors requests from clients for a specific set of origins
    app.use(cors({
        origin: [process.env.FRONTEND_BASE_URL],
        optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
    }));

    // For HTTP request logging in development environment
    if (app.get('env') === 'development') {
        app.use(morgan(':remote-addr - :method :url :status :res[content-length] - :response-time ms'));
    }
}