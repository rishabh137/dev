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
        methods: ["GET", "POST"]
    },
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", ({ roomId, peerId }) => {
        console.log(`${peerId} joining room ${roomId}`);

        socket.join(roomId);
        socket.to(roomId).emit("user-connected", peerId);

        socket.peerId = peerId;
        socket.roomId = roomId;

        console.log(`Room ${roomId} users:`, Array.from(io.sockets.adapter.rooms.get(roomId) || []));
    });

    socket.on("code-changed", ({ roomId, code }) => {
        socket.to(roomId).emit("code-changed", code);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        if (socket.roomId) {
            socket.to(socket.roomId).emit("user-disconnected", socket.peerId);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});