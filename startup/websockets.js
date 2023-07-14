module.exports = function (server) {
    const io = require("socket.io")(server, {
        pingTimeout: 60000,
        cors: {
            origin: process.env.FRONTEND_BASE_URL
        },
    });

    const onlineUsers = {};

    io.on('connection', (socket) => {
        const socketId = socket.id;
        console.log(`A user with the id: ${socketId} is connected`);

        socket.on('setup', (userId) => {
            socket.join(userId);

            onlineUsers[userId] = socketId;

            io.emit('onlineUsers', onlineUsers);
        });

        socket.on('sendMessage', (message) => {
            message.chat.users.forEach((user) => {
                if (user !== message.sender._id) {
                    io.to(user).emit('receiveMessage', message);
                }
            })
        });

        socket.on('disconnect', () => {
            for (const key in onlineUsers) {
                if (onlineUsers[key] === socketId) { 
                    console.log(`A user with the id: ${socketId} is disconnected`);

                    socket.leave(key);
                    delete onlineUsers[key];
                }
            }
            
            io.emit('onlineUsers', onlineUsers);
        });
    });
}

