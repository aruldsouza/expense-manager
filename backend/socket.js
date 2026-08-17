const { Server } = require('socket.io');

let io;

/**
 * Initialize Socket.IO with the HTTP server and CORS whitelist.
 * Call this once in server.js.
 */
const initSocket = (httpServer, corsOrigins) => {
    io = new Server(httpServer, {
        cors: {
            origin: corsOrigins || '*',
            methods: ['GET', 'POST']
        }
    });


    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.id}`);

        // Client sends { groupId } to join a group room
        socket.on('join:group', (groupId) => {
            if (groupId) {
                socket.join(`group:${groupId}`);
                console.log(`📌 Socket ${socket.id} joined group:${groupId}`);
            }
        });

        // Client sends { groupId } to leave a group room
        socket.on('leave:group', (groupId) => {
            if (groupId) {
                socket.leave(`group:${groupId}`);
                console.log(`📤 Socket ${socket.id} left group:${groupId}`);
            }
        });

        // Client sends userId to join their private notification room
        socket.on('join:user', (userId) => {
            if (userId) {
                socket.join(`user:${userId}`);
                console.log(`🔔 Socket ${socket.id} joined user:${userId}`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};

/**
 * Get the live io instance for use in controllers.
 * Throws if initSocket() hasn't been called yet.
 */
const getIO = () => {
    if (!io) throw new Error('Socket.IO not initialized — call initSocket first');
    return io;
};

module.exports = { initSocket, getIO };
