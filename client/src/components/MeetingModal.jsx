import { NavLink } from "react-router-dom";
import toast from "react-hot-toast";
import { useContext } from "react";
import { CodeContext } from "../contexts/CodeContext";

const MeetingModal = ({ showlaterMeetLink, setShowLaterMeetLink, meetLink, setMeetLink, setOpenMeetLinkModal }) => {
    const { codingStarted } = useContext(CodeContext);

    const copyToClipBoard = () => {
        navigator.clipboard.writeText(meetLink);
        toast.success('Copied!');
    }

    return (
        <>
            <div className={`${codingStarted ? "w-1/2" : "w-full"} fixed inset-0 flex items-center justify-center bg-opacity-50 z-50`}>
                <div className="bg-white dark:bg-[#2c2c2c] rounded-xl shadow-lg w-100 p-6 text-center">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">New Meeting</h2>
                    <ul className="space-y-4">
                        {
                            !meetLink || !showlaterMeetLink ?
                                <li
                                    className="flex items-center gap-3 p-3 rounded-md bg-gray-100 dark:bg-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                    onClick={() => setShowLaterMeetLink(true)}
                                >
                                    <i className="fa-solid fa-link text-cyan-500"></i>
                                    <span className="text-gray-800 dark:text-white">Create a meeting for later</span>
                                </li>
                                :
                                <li
                                    className="flex items-center gap-3 p-3 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                >
                                    <span className="text-gray-800 dark:text-white text text-sm">{meetLink}</span>
                                    <i className="fa-regular fa-copy text-cyan-500 cursor-pointer p-2 hover:bg-gray-300 hover:rounded-md transition"
                                        onClick={copyToClipBoard}
                                    ></i>
                                </li>
                        }
                        <NavLink to={meetLink}
                            className="flex items-center gap-3 p-3 rounded-md bg-gray-100 dark:bg-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                        >
                            <i className="fa-solid fa-plus text-cyan-500"></i>
                            <span className="text-gray-800 dark:text-white">Start an instant meeting</span>
                        </NavLink>
                    </ul>
                    <button
                        className="mt-6 px-4 py-2 text-sm rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                        onClick={() => {
                            setOpenMeetLinkModal(false);
                            setMeetLink('')
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </>
    )
}

export default MeetingModal;