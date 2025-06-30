import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

const rooms = new Map();

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", ({ roomId, peerId }) => {
        console.log(`User ${peerId} joining room ${roomId}`);

        socket.join(roomId);
        socket.roomId = roomId;
        socket.peerId = peerId;

        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }

        const roomPeers = rooms.get(roomId);

        roomPeers.forEach((existingPeerId) => {
            socket.emit("user-connected", existingPeerId);
        });

        socket.to(roomId).emit("user-connected", peerId);

        roomPeers.add(peerId);
    });

    socket.on("leave-room", ({ roomId, peerId }) => {
        if (rooms.has(roomId)) {
            const roomPeers = rooms.get(roomId);
            roomPeers.delete(peerId);
            socket.to(roomId).emit("user-disconnected", peerId);

            if (roomPeers.size === 0) {
                rooms.delete(roomId);
            }
        }
        socket.leave(roomId);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        if (socket.roomId && socket.peerId) {
            const roomPeers = rooms.get(socket.roomId);
            if (roomPeers) {
                roomPeers.delete(socket.peerId);
                socket.to(socket.roomId).emit("user-disconnected", socket.peerId);
                if (roomPeers.size === 0) {
                    rooms.delete(socket.roomId);
                }
            }
        }
    });

    socket.on("start-code", ({ roomId }) => {
        socket.to(roomId).emit("start-code");
    });

    socket.on("code-changed", ({ roomId, code }) => {
        socket.to(roomId).emit("code-changed", code);
    });

    socket.on("run-code", ({ roomId, output }) => {
        socket.to(roomId).emit("code-output", output);
    });
});


server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});
