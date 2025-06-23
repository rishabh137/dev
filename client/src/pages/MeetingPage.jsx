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
        const socket = io("https://dev-qq9j.onrender.com");
        socketRef.current = socket;

        const peer = new Peer();
        peerInstance.current = peer;

        peer.on("open", async (peerId) => {
            console.log("Peer opened with ID:", peerId);

            try {
                const userStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });

                setStream(userStream);

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = userStream;
                }

                // Join room after getting stream
                socket.emit("join-room", { roomId: id, peerId });

                // Handle incoming calls
                peer.on("call", (call) => {
                    console.log("Answering incoming call");
                    call.answer(userStream);
                    currentCall.current = call;

                    call.on("stream", (remoteStream) => {
                        console.log("Received remote stream");
                        if (remoteVideoRef.current) {
                            remoteVideoRef.current.srcObject = remoteStream;
                            setRemoteConnected(true);
                        }
                    });
                });

            } catch (error) {
                console.error("Error accessing media:", error);
            }
        });

        // Handle new user joining
        socket.on("user-connected", (remotePeerId) => {
            console.log("New user connected:", remotePeerId);

            if (stream) {
                console.log("Calling new user");
                const call = peer.call(remotePeerId, stream);
                currentCall.current = call;

                call.on("stream", (remoteStream) => {
                    console.log("Received stream from outgoing call");
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = remoteStream;
                        setRemoteConnected(true);
                    }
                });
            }
        });

        socket.on("user-disconnected", () => {
            setRemoteConnected(false);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
            }
        });

        return () => {
            currentCall.current?.close();
            peer.destroy();
            socket.disconnect();
            stream?.getTracks().forEach(track => track.stop());
        };
    }, [id]);

    const toggleCamera = () => {
        if (stream) {
            stream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setCameraOn(prev => !prev);
        }
    };

    const toggleMic = () => {
        if (stream) {
            stream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setMicOn(prev => !prev);
        }
    };

    const endCall = () => {
        currentCall.current?.close();
        stream?.getTracks().forEach(track => track.stop());
        socketRef.current?.disconnect();
        navigate("/");
    };

    return (
        <div className="flex flex-col dark:bg-gray-900 h-screen">
            {!stream && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <Loader />
                </div>
            )}

            <div className="flex flex-1">
                <div className={`${codingStarted ? "w-1/2" : "w-full"} flex flex-col items-center justify-center p-4`}>
                    <div className="flex gap-4 mb-4">
                        <video
                            ref={localVideoRef}
                            className="w-80 h-60 bg-gray-800 rounded"
                            autoPlay
                            playsInline
                            muted
                        />
                        {remoteConnected && (
                            <video
                                ref={remoteVideoRef}
                                className="w-80 h-60 bg-gray-800 rounded"
                                autoPlay
                                playsInline
                            />
                        )}
                    </div>

                    {stream && (
                        <div className="flex gap-4">
                            <button
                                onClick={toggleCamera}
                                className={`p-3 rounded-full ${cameraOn ? 'bg-blue-500' : 'bg-red-500'} text-white`}
                            >
                                {cameraOn ? <Camera size={24} /> : <CameraOff size={24} />}
                            </button>
                            <button
                                onClick={toggleMic}
                                className={`p-3 rounded-full ${micOn ? 'bg-green-500' : 'bg-red-500'} text-white`}
                            >
                                {micOn ? <Mic size={24} /> : <MicOff size={24} />}
                            </button>
                            <button
                                onClick={endCall}
                                className="p-3 rounded-full bg-red-600 text-white"
                            >
                                <Phone size={24} />
                            </button>
                        </div>
                    )}
                </div>

                {codingStarted && <CodePage />}
            </div>
        </div>
    );
};

export default MeetingPage;