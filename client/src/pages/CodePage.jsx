import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";
import { LoaderIcon } from "react-hot-toast";
import io from "socket.io-client";
import { useParams } from "react-router-dom";

const CodePage = () => {
    const [socket, setSocket] = useState(null);
    const { roomId } = useParams();
    const [language, setLanguage] = useState("java");
    const [code, setCode] = useState("");
    const [output, setOutput] = useState("");
    const [runCodingLoader, setRunCodingLoader] = useState(false);

    const languageIds = {
        javascript: 63,
        python: 71,
        java: 62,
        cpp: 54,
    };

    const boilerplates = {
        javascript: `console.log("Hello World");`,
        python: `print("Hello World")`,
        java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`,
        cpp: `#include<iostream>
using namespace std;

int main() {
    cout << "Hello World" << endl;
    return 0;
}`,
    };

    useEffect(() => {
        setCode(boilerplates[language]);
    }, [language]);

    useEffect(() => {
        const newSocket = io("https://dev-qq9j.onrender.com");
        setSocket(newSocket);

        const peerId = crypto.randomUUID();
        newSocket.emit("join-room", { roomId, peerId });

        newSocket.on("code-changed", (newCode) => {
            setCode(newCode);
        });

        newSocket.on("code-output", (output) => {
            setOutput(output);
        });

        return () => newSocket.disconnect();
    }, [roomId]);

    const handleEditorChange = (value) => {
        setCode(value);
        socket.emit("code-changed", { roomId, code: value });
    };

    const handleRunCode = async () => {
        if (runCodingLoader == true) return;

        const encodedSourceCode = code;
        setRunCodingLoader(true);
        setOutput("")

        try {
            const { data } = await axios.post(
                "https://judge0-ce.p.rapidapi.com/submissions",
                {
                    source_code: encodedSourceCode,
                    language_id: languageIds[language],
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-RapidAPI-Key": import.meta.env.VITE_RAPIDAPI_KEY,
                        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
                    },
                }
            );

            const token = data.token;

            const interval = setInterval(async () => {
                console.log("hell", import.meta.env.VITE_RAPIDAPI_KEY);
                const res = await axios.get(
                    `https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=false`,
                    {
                        headers: {
                            "X-RapidAPI-Key": import.meta.env.VITE_RAPIDAPI_KEY,
                            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
                        },
                    }
                );

                if (res.data.status.id >= 3) {
                    clearInterval(interval);
                    if (res.data.stdout) {
                        setOutput(res.data.stdout);
                        socket.emit("run-code", { roomId, output: res.data.stdout });
                    } else if (res.data.compile_output) {
                        setOutput(res.data.compile_output);
                        socket.emit("run-code", { roomId, output: res.data.compile_output });
                    } else if (res.data.stderr) {
                        setOutput(res.data.stderr);
                        socket.emit("run-code", { roomId, output: res.data.stderr });
                    } else {
                        setOutput("No Output.");
                        socket.emit("run-code", { roomId, output: "No Output." });
                    }
                    setRunCodingLoader(false);
                }
            }, 1500);
        } catch (error) {
            setRunCodingLoader(false);
            setOutput("Error while executing code.");
        }
    };

    return (
        <div className={`flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 w-full overflow-hidden h-210`}>
            <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800">
                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="px-3 py-2 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                    <option value="java">Java</option>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                </select>

                <button
                    className="h-12 w-28 flex justify-center items-center ml-4 px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition cursor-pointer"
                    onClick={handleRunCode}
                >
                    {runCodingLoader ? <LoaderIcon className="h-5 w-5" /> : "Run Code"}
                </button>
            </div>

            <div className="flex-1">
                <Editor
                    height="100%"
                    theme="vs-dark"
                    language={language}
                    value={code}
                    onChange={handleEditorChange}
                />
            </div>

            <div className="p-4 bg-gray-100 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700">
                <h2 className="text-lg font-semibold mb-2">Output:</h2>
                <pre className="bg-white dark:bg-gray-900 p-4 rounded overflow-auto text-gray-800 dark:text-white h-30">
                    {output}
                </pre>
            </div>
        </div>
    );
};

export default CodePage;
