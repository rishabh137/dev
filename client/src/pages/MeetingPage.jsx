import { useState, useRef, useEffect, useContext } from "react";
import Peer from "peerjs";
import { useParams, useNavigate } from "react-router-dom";
import { Camera, CameraOff, Mic, MicOff, Phone, Bug } from "lucide-react";
import { CodeContext } from "../contexts/CodeContext";
import CodePage from "./CodePage";
import io from "socket.io-client";
import Loader from "../components/Loader";

const MeetingPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const { codingStarted } = useContext(CodeContext);
    const [stream, setStream] = useState(null);
    const [cameraOn, setCameraOn] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [remoteConnected, setRemoteConnected] = useState(false);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerInstance = useRef(null);
    const socketRef = useRef(null);
    const callRefs = useRef({});
    const pendingCalls = useRef([]);

    // Debug function
    const debugStreamState = () => {
        console.log("=== Stream Debug Info ===");
        console.log("Local stream:", stream);
        console.log("Local stream tracks:", stream?.getTracks());
        console.log("Peer instance:", peerInstance.current);
        console.log("Peer ID:", peerInstance.current?.id);
        console.log("Remote connected:", remoteConnected);
        console.log("Active calls:", Object.keys(callRefs.current));
        console.log("Pending calls:", pendingCalls.current);
        console.log("Socket connected:", socketRef.current?.connected);
        console.log("Room ID:", id);
        console.log("========================");
    };

    // Enhanced remote stream handler
    const handleRemoteStream = async (remoteStream) => {
        try {
            console.log("Received remote stream:", remoteStream);
            console.log("Remote stream tracks:", remoteStream.getTracks());

            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;

                // Add error handling for video play
                try {
                    await remoteVideoRef.current.play();
                    console.log("Remote video started playing");
                    setRemoteConnected(true);
                } catch (playError) {
                    console.error("Error playing remote video:", playError);
                    // Try to play again after a short delay
                    setTimeout(async () => {
                        try {
                            await remoteVideoRef.current.play();
                            console.log("Remote video started playing (retry)");
                            setRemoteConnected(true);
                        } catch (retryError) {
                            console.error("Retry play failed:", retryError);
                        }
                    }, 500);
                }
            }
        } catch (error) {
            console.error("Error handling remote stream:", error);
        }
    };

    useEffect(() => {
        const peer = new Peer();
        peerInstance.current = peer;

        const socket = io("https://dev-qq9j.onrender.com");
        socketRef.current = socket;

        // Enhanced peer event handlers
        peer.on("open", (peerId) => {
            console.log("My Peer ID:", peerId);
            navigator.mediaDevices
                .getUserMedia({ video: true, audio: true })
                .then((userStream) => {
                    console.log("Got local stream:", userStream);
                    console.log("Local stream tracks:", userStream.getTracks());
                    setStream(userStream);

                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = userStream;
                        localVideoRef.current.play().catch(e => console.error("Local video play error:", e));
                    }

                    socket.emit("join-room", { roomId: id, peerId });
                })
                .catch((error) => {
                    console.error("Error getting user media:", error);
                });
        });

        // Enhanced incoming call handler
        peer.on("call", (incomingCall) => {
            console.log("Incoming call received from:", incomingCall.peer);
            if (!stream) {
                console.log("No local stream yet, can't answer");
                return;
            }

            console.log("Answering call with stream:", stream);
            incomingCall.answer(stream);

            incomingCall.on("stream", (remoteStream) => {
                console.log("Received stream from incoming call");
                handleRemoteStream(remoteStream);
            });

            // Add error handling for the call
            incomingCall.on("error", (error) => {
                console.error("Incoming call error:", error);
            });

            incomingCall.on("close", () => {
                console.log("Incoming call closed");
                setRemoteConnected(false);
            });

            // Store the call reference
            callRefs.current[incomingCall.peer] = incomingCall;
        });

        peer.on("error", (error) => {
            console.error("Peer error:", error);
        });

        // Enhanced user connection handler
        socket.on("user-connected", (remotePeerId) => {
            console.log("User connected event received for:", remotePeerId);
            console.log("Current stream available:", !!stream);
            console.log("Peer instance available:", !!peerInstance.current);

            if (peerInstance.current && stream) {
                console.log("Making call to:", remotePeerId);
                const call = peerInstance.current.call(remotePeerId, stream);

                if (call) {
                    console.log("Call created successfully");
                    callRefs.current[remotePeerId] = call;

                    call.on("stream", (remoteStream) => {
                        console.log("Received stream from outgoing call");
                        handleRemoteStream(remoteStream);
                    });

                    // Add error handling
                    call.on("error", (error) => {
                        console.error("Outgoing call error:", error);
                    });

                    call.on("close", () => {
                        console.log("Outgoing call closed with:", remotePeerId);
                        setRemoteConnected(false);
                        delete callRefs.current[remotePeerId];
                    });
                } else {
                    console.error("Failed to create call");
                }
            } else {
                console.log("Adding to pending calls:", remotePeerId);
                pendingCalls.current.push(remotePeerId);
            }
        });

        // handle user disconnects
        socket.on("user-disconnected", (peerId) => {
            console.log("User disconnected:", peerId);
            if (callRefs.current[peerId]) {
                callRefs.current[peerId].close();
                delete callRefs.current[peerId];
                setRemoteConnected(false);
            }
        });

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected");
        });

        return () => {
            console.log("Cleaning up...");
            Object.values(callRefs.current).forEach((call) => call.close());
            peer.destroy();
            socket.disconnect();
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, [id]);

    // Enhanced pending calls processor
    useEffect(() => {
        if (stream && peerInstance.current && pendingCalls.current.length > 0) {
            console.log("Processing pending calls:", pendingCalls.current);

            pendingCalls.current.forEach((remotePeerId) => {
                console.log("Processing pending call to:", remotePeerId);
                const call = peerInstance.current.call(remotePeerId, stream);

                if (call) {
                    callRefs.current[remotePeerId] = call;
                    call.on("stream", (remoteStream) => {
                        console.log("Received stream from pending call");
                        handleRemoteStream(remoteStream);
                    });

                    call.on("error", (error) => {
                        console.error("Pending call error:", error);
                    });

                    call.on("close", () => {
                        console.log("Pending call closed with:", remotePeerId);
                        setRemoteConnected(false);
                        delete callRefs.current[remotePeerId];
                    });
                }
            });

            pendingCalls.current = [];
        }
    }, [stream]);

    const toggleCamera = () => {
        if (stream) {
            stream.getVideoTracks().forEach((track) => {
                track.enabled = !track.enabled;
                console.log("Camera track enabled:", track.enabled);
            });
            setCameraOn((prev) => !prev);
        }
    };

    const toggleMic = () => {
        if (stream) {
            stream.getAudioTracks().forEach((track) => {
                track.enabled = !track.enabled;
                console.log("Audio track enabled:", track.enabled);
            });
            setMicOn((prev) => !prev);
        }
    };

    const endCall = () => {
        console.log("Ending call...");
        if (socketRef.current && peerInstance.current) {
            socketRef.current.emit("leave-room", {
                roomId: id,
                peerId: peerInstance.current.id,
            });
        }

        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
        }

        navigate("/");
    };

    return (
        <div className="flex flex-col dark:bg-gray-900 h-screen">
            {!stream && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80 rounded z-10">
                    <Loader />
                </div>
            )}
            <div className="flex flex-1">
                <div className="w-full flex flex-col items-center justify-center">
                    <div className="flex gap-4 mb-4 mt-5 max-w-6xl w-full px-4">
                        <div className="flex-1 relative">
                            <video
                                ref={localVideoRef}
                                className="w-full rounded-lg shadow-lg"
                                playsInline
                                muted
                                autoPlay
                                controls={false}
                            ></video>
                            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                                You
                            </div>
                        </div>

                        {remoteConnected && (
                            <div className="flex-1 relative">
                                <video
                                    ref={remoteVideoRef}
                                    className="w-full rounded-lg shadow-lg"
                                    playsInline
                                    autoPlay
                                    controls={false}
                                ></video>
                                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                                    Remote User
                                </div>
                            </div>
                        )}

                        {!remoteConnected && stream && (
                            <div className="flex-1 flex items-center justify-center bg-gray-800 rounded-lg">
                                <div className="text-center text-gray-400">
                                    <div className="text-lg mb-2">Waiting for other participant...</div>
                                    <div className="text-sm">Room ID: {id}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 dark:bg-gray-800 flex gap-2 justify-center">
                        <button
                            onClick={toggleCamera}
                            className={`${cameraOn ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'} text-white px-4 py-2 rounded-lg transition-colors`}
                            title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
                        >
                            {cameraOn ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
                        </button>

                        <button
                            onClick={toggleMic}
                            className={`${micOn ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white px-4 py-2 rounded-lg transition-colors`}
                            title={micOn ? 'Turn off microphone' : 'Turn on microphone'}
                        >
                            {micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                        </button>

                        <button
                            onClick={debugStreamState}
                            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
                            title="Debug stream state"
                        >
                            <Bug className="w-6 h-6" />
                        </button>

                        <button
                            onClick={endCall}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                            title="End call"
                        >
                            <Phone className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                {codingStarted && <CodePage />}
            </div>
        </div>
    );
};

export default MeetingPage;