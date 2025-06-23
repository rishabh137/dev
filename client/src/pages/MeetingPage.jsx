import { useState, useRef, useEffect, useContext } from "react";
import Peer from "peerjs";
import { useParams, useNavigate } from "react-router-dom";
import { Camera, CameraOff, Mic, MicOff, Phone } from 'lucide-react';
import { CodeContext } from "../contexts/CodeContext";
import CodePage from "./CodePage";
import io from "socket.io-client";
import Loader from "../components/Loader";

const MeetingPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const { codingStarted } = useContext(CodeContext);
    const [stream, setStream] = useState(null);
    const [remoteConnected, setRemoteConnected] = useState(false);
    const [cameraOn, setCameraOn] = useState(true);
    const [micOn, setMicOn] = useState(true);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerInstance = useRef(null);
    const currentCall = useRef(null);
    const socketRef = useRef(null);

    useEffect(() => {
        // Generate a unique peer ID based on room and timestamp
        const myPeerId = `${id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const peer = new Peer(myPeerId);
        peerInstance.current = peer;

        const socket = io("https://dev-qq9j.onrender.com");
        socketRef.current = socket;

        peer.on("open", (peerId) => {
            console.log("My Peer ID:", peerId);

            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then((userStream) => {
                    setStream(userStream);

                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = userStream;
                        localVideoRef.current.play();
                    }

                    // Join room with peer ID
                    socket.emit("join-room", { roomId: id, peerId });

                    // Handle incoming calls
                    peer.on("call", (incomingCall) => {
                        console.log("Receiving call from:", incomingCall.peer);
                        incomingCall.answer(userStream);
                        currentCall.current = incomingCall;

                        incomingCall.on("stream", (remoteStream) => {
                            console.log("Received remote stream");
                            if (remoteVideoRef.current) {
                                remoteVideoRef.current.srcObject = remoteStream;
                                remoteVideoRef.current.play();
                                setRemoteConnected(true);
                            }
                        });

                        incomingCall.on("close", () => {
                            setRemoteConnected(false);
                        });
                    });
                })
                .catch((error) => {
                    console.error("Error accessing media devices:", error);
                });
        });

        // Handle user connection
        socket.on("user-connected", (remotePeerId) => {
            console.log("User connected:", remotePeerId);

            // Only call if we have a stream and no active call
            if (stream && !currentCall.current) {
                setTimeout(() => {
                    console.log("Calling user:", remotePeerId);
                    const call = peer.call(remotePeerId, stream);
                    currentCall.current = call;

                    call.on("stream", (remoteStream) => {
                        console.log("Received remote stream from call");
                        if (remoteVideoRef.current) {
                            remoteVideoRef.current.srcObject = remoteStream;
                            remoteVideoRef.current.play();
                            setRemoteConnected(true);
                        }
                    });

                    call.on("close", () => {
                        setRemoteConnected(false);
                    });
                }, 1000); // Small delay to ensure both peers are ready
            }
        });

        // Handle user disconnection
        socket.on("user-disconnected", (peerId) => {
            console.log("User disconnected:", peerId);
            setRemoteConnected(false);
            if (currentCall.current) {
                currentCall.current.close();
                currentCall.current = null;
            }
        });

        peer.on("error", (error) => {
            console.error("Peer error:", error);
        });

        socket.on("connect_error", (error) => {
            console.error("Socket connection error:", error);
        });

        return () => {
            if (currentCall.current) {
                currentCall.current.close();
            }
            peer.destroy();
            socket.disconnect();
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, [id]);

    const toggleCamera = () => {
        if (stream) {
            stream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
            setCameraOn((prev) => !prev);
        }
    };

    const toggleMic = () => {
        if (stream) {
            stream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
            setMicOn((prev) => !prev);
        }
    };

    const endCall = () => {
        if (currentCall.current) {
            currentCall.current.close();
        }
        if (socketRef.current) {
            socketRef.current.emit("leave-room", { roomId: id });
        }
        stream?.getTracks().forEach((track) => track.stop());
        navigate("/");
    };

    return (
        <div className="flex flex-col dark:bg-gray-900 h-190">
            {!stream && (
                <div className={`${codingStarted ? "w-1/2" : "w-full"} absolute inset-0 flex items-center justify-center bg-opacity-80 rounded`}>
                    <Loader />
                </div>
            )}
            <div className="flex flex-1">
                <div className={`${codingStarted ? "w-1/2" : "w-full"} flex flex-col items-center justify-center`}>
                    <div className={`${codingStarted ? "flex-col-reverse" : ""} flex gap-4 mb-4 mt-5`}>
                        <video
                            ref={localVideoRef}
                            className={`${codingStarted && remoteConnected ? "h-40" : "h-auto"} w-full rounded`}
                            playsInline
                            muted
                        ></video>
                        {remoteConnected && (
                            <video
                                ref={remoteVideoRef}
                                className={`${codingStarted ? "h-96" : "h-auto"} rounded`}
                                playsInline
                            ></video>
                        )}
                    </div>
                    {stream && (
                        <div className="p-4 dark:bg-gray-800 flex gap-2 justify-end">
                            <button
                                onClick={toggleCamera}
                                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 cursor-pointer"
                            >
                                {cameraOn ? <Camera className="w-8 h-8" /> : <CameraOff className="w-8 h-8" />}
                            </button>
                            <button
                                onClick={toggleMic}
                                className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 cursor-pointer"
                            >
                                {micOn ? <Mic className="w-8 h-8 text-white" /> : <MicOff className="w-8 h-8 text-white" />}
                            </button>
                            <button
                                onClick={endCall}
                                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 cursor-pointer"
                            >
                                <Phone className="w-8 h-8 text-white" />
                            </button>
                        </div>
                    )}
                </div>

                {codingStarted && (
                    <CodePage />
                )}
            </div>
        </div>
    );
};

export default MeetingPage;