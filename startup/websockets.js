module.exports = function (server) {
    const io = require("socket.io")(server, {
        pingTimeout: 60000,
        cors: {
            origin: process.env.FRONTEND_BASE_URL
        },
    });

    io.on('connection', (socket) => {
        console.log('a user connected');

        socket.on('disconnect', () => {
            console.log('user disconnected');
        });
    });
}

