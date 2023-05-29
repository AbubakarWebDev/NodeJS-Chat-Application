const mongoose = require('mongoose');
const debug = require('debug')('app:debug');

module.exports = function () {
    // When strict option is set to true, Mongoose will ensure that only the fields that are specified in your Schema will be saved in the database, and all other fields will not be saved (if some other fields are sent)
    mongoose.set("strictQuery", true);

    // Connect to the MongoDB database using the connection string stored in the environment variable
    mongoose.connect(process.env.CONNECTION_STRING, {
        useNewUrlParser: true,      // Use the new URL parser to parse connection strings
        useUnifiedTopology: true    // Use the new Server Discovery and Monitoring engine
    })

    // Get the connection object
    const db = mongoose.connection;

    // Listen for connection events
    db.once('open', function () {
        debug("Connected to MongoDB");
    });

    // If the connection is not successful
    db.on('error', function(err) {
        debug('MongoDB connection error:', err);
    });
}