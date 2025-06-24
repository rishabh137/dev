import { useState, useRef, useEffect, useContext } from "react";
import Peer from "peerjs";
import { useParams, useNavigate } from "react-router-dom";
import { Camera, CameraOff, Mic, MicOff, Phone } from "lucide-react";
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

    useEffect(() => {
        const peer = new Peer();
        peerInstance.current = peer;

        const socket = io("https://dev-qq9j.onrender.com");
        socketRef.current = socket;

        // listen for incoming calls immediately
        peer.on("call", (incomingCall) => {
            if (!stream) {
                console.log("No local stream yet, can't answer");
                return;
            }
            incomingCall.answer(stream);
            incomingCall.on("stream", (remoteStream) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = remoteStream;
                    remoteVideoRef.current.play();
                    setRemoteConnected(true);
                }

            });
        });

        // listen for remote users joining
        socket.on("user-connected", (remotePeerId) => {
            console.log("Connecting to", remotePeerId);
            if (peerInstance.current && stream) {
                const call = peerInstance.current.call(remotePeerId, stream);
                if (call) {
                    callRefs.current[remotePeerId] = call;
                    call.on("stream", (remoteStream) => {
                        if (remoteVideoRef.current) {
                            remoteVideoRef.current.srcObject = remoteStream;
                            remoteVideoRef.current.play();
                            setRemoteConnected(true);
                        }

                    });
                }
            } else {
                pendingCalls.current.push(remotePeerId);
            }
        });

        // peer open → get local stream
        peer.on("open", (peerId) => {
            console.log("My Peer ID:", peerId);
            navigator.mediaDevices
                .getUserMedia({ video: true, audio: true })
                .then((userStream) => {
                    setStream(userStream);
                    localVideoRef.current.srcObject = userStream;
                    localVideoRef.current.play();
                    socket.emit("join-room", { roomId: id, peerId });
                });
        });

        // handle user disconnects
        socket.on("user-disconnected", (peerId) => {
            console.log("Disconnected:", peerId);
            if (callRefs.current[peerId]) {
                callRefs.current[peerId].close();
                delete callRefs.current[peerId];
                setRemoteConnected(false);
            }
        });

        return () => {
            Object.values(callRefs.current).forEach((call) => call.close());
            peer.destroy();
            socket.disconnect();
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, [id]);

    // process pending calls when stream is ready
    useEffect(() => {
        if (stream && peerInstance.current) {
            pendingCalls.current.forEach((remotePeerId) => {
                const call = peerInstance.current.call(remotePeerId, stream);
                if (call) {
                    callRefs.current[remotePeerId] = call;
                    call.on("stream", (remoteStream) => {
                        if (remoteVideoRef.current) {
                            remoteVideoRef.current.srcObject = remoteStream;
                            remoteVideoRef.current.play();
                            setRemoteConnected(true);
                        }

                    });
                }
            });
            pendingCalls.current = [];
        }
    }, [stream]);

    const toggleCamera = () => {
        stream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
        setCameraOn((prev) => !prev);
    };

    const toggleMic = () => {
        stream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
        setMicOn((prev) => !prev);
    };

    const endCall = () => {
        socketRef.current.emit("leave-room", {
            roomId: id,
            peerId: peerInstance.current.id,
        });
        stream.getTracks().forEach((track) => track.stop());
        navigate("/");
    };

    return (
        <div className="flex flex-col dark:bg-gray-900 h-190">
            {!stream && (
                <div className="absolute inset-0 flex items-center justify-center bg-opacity-80 rounded">
                    <Loader />
                </div>
            )}
            <div className="flex flex-1">
                <div className="w-full flex flex-col items-center justify-center">
                    <div className="flex gap-4 mb-4 mt-5">
                        <video
                            ref={localVideoRef}
                            className="w-full rounded"
                            playsInline
                            muted
                        ></video>
                        {remoteConnected && (
                            <video
                                ref={remoteVideoRef}
                                className="w-full rounded"
                                playsInline
                            ></video>
                        )}
                    </div>
                    <div className="p-4 dark:bg-gray-800 flex gap-2 justify-end">
                        <button
                            onClick={toggleCamera}
                            className="bg-blue-500 text-white px-3 py-1 rounded"
                        >
                            {cameraOn ? <Camera className="w-8 h-8" /> : <CameraOff className="w-8 h-8" />}
                        </button>
                        <button
                            onClick={toggleMic}
                            className="bg-yellow-500 text-white px-3 py-1 rounded"
                        >
                            {micOn ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
                        </button>
                        <button
                            onClick={endCall}
                            className="bg-red-600 text-white px-3 py-1 rounded"
                        >
                            <Phone className="w-8 h-8" />
                        </button>
                    </div>
                </div>
                {codingStarted && <CodePage />}
            </div>
        </div>
    );
};

export default MeetingPage;
