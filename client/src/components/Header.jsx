import ToggleMode from "./ToggleMode"
import { CodeContext } from "../contexts/CodeContext";
import { useContext } from "react";

const Header = () => {
    const { codingStarted, setCodingStarted } = useContext(CodeContext);
    return (
        <>
            <header className="bg-gradient-to-r from-[#1f1f1f] via-gray-800 to-[#1f1f1f] p-6 shadow-lg flex items-center justify-between">
                <h1 className="text-4xl font-extrabold text-white tracking-wide">
                    code<span className="text-cyan-400 drop-shadow-[0_0_5px_#00ffe7]">X</span>
                </h1>

                <div className="right-4 flex items-center">
                    <button
                        onClick={() => setCodingStarted(!codingStarted)}
                        className="bg-cyan-500 text-white px-3 py-1 rounded hover:bg-cyan-600 cursor-pointer mx-20"
                    >
                        {codingStarted ?
                            "Stop Coding"
                            :
                            "Start Coding"
                        }
                    </button>
                    <ToggleMode />
                </div>
            </header >
        </>
    )
}

export default Header;