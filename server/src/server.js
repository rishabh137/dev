import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

const app = express();
dotenv.config();
const PORT = process.env.PORT || 3000;

app.use(cors());
const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

// Store room information
const rooms = new Map();

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", ({ roomId, peerId }) => {
        console.log(`User ${peerId} joining room ${roomId}`);

        // Leave any previous rooms
        Array.from(socket.rooms).forEach(room => {
            if (room !== socket.id) {
                socket.leave(room);
            }
        });

        // Join the new room
        socket.join(roomId);

        // Initialize room if it doesn't exist
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }

        const roomUsers = rooms.get(roomId);

        // Notify existing users about the new user
        socket.to(roomId).emit("user-connected", peerId);

        // Add user to room
        roomUsers.add({
            socketId: socket.id,
            peerId: peerId
        });

        console.log(`Room ${roomId} now has ${roomUsers.size} users`);

        // Store room and peer info in socket
        socket.roomId = roomId;
        socket.peerId = peerId;
    });

    socket.on("leave-room", ({ roomId }) => {
        handleUserLeaving(socket, roomId);
    });

    socket.on("code-changed", ({ roomId, code }) => {
        socket.to(roomId).emit("code-changed", code);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        if (socket.roomId) {
            handleUserLeaving(socket, socket.roomId);
        }
    });

    function handleUserLeaving(socket, roomId) {
        if (rooms.has(roomId)) {
            const roomUsers = rooms.get(roomId);

            // Remove user from room
            roomUsers.forEach(user => {
                if (user.socketId === socket.id) {
                    roomUsers.delete(user);
                    // Notify others that user disconnected
                    socket.to(roomId).emit("user-disconnected", user.peerId);
                }
            });

            // Clean up empty rooms
            if (roomUsers.size === 0) {
                rooms.delete(roomId);
                console.log(`Room ${roomId} deleted (empty)`);
            } else {
                console.log(`Room ${roomId} now has ${roomUsers.size} users`);
            }
        }

        socket.leave(roomId);
    }
});

server.listen(PORT, () => console.log(`Socket server running on port ${PORT}`));