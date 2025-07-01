import { useContext, useEffect, useState } from "react";

import Xconstant from "../constant/Xconstant";

import HomeContent from "../components/HomeContent";
import HomeButton from "../components/HomeButton";
import MeetingModal from "../components/MeetingModal";
import { CodeContext } from "../contexts/CodeContext";
import CodePage from "./CodePage";

const HomePage = () => {
    const baseUrl = Xconstant.baseUrl
    const [openMeetLinkModal, setOpenMeetLinkModal] = useState(false);
    const [showlaterMeetLink, setShowLaterMeetLink] = useState(false);
    const [meetLink, setMeetLink] = useState('');
    const { codingStarted } = useContext(CodeContext);

    useEffect(() => {
        const generateUUID = () => {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                const r = Math.random() * 16 | 0,
                    v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };

        const meetLink = baseUrl + 'meeting/' + generateUUID();
        setMeetLink(meetLink);
    }, []);


    return (
        <>
            <div className="flex flex-1">
                <div className={`h-190 flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-6 w-full`}>

                    <HomeContent />

                    <div className="relative inline-block text-left">
                        <HomeButton setOpenMeetLinkModal={setOpenMeetLinkModal} />

                        {openMeetLinkModal && (
                            <MeetingModal
                                showlaterMeetLink={showlaterMeetLink}
                                setShowLaterMeetLink={setShowLaterMeetLink}
                                meetLink={meetLink}
                                setMeetLink={setMeetLink}
                                setOpenMeetLinkModal={setOpenMeetLinkModal}
                            />
                        )}
                    </div>
                </div>

                {codingStarted && (
                    <CodePage />
                )}
            </div>
        </>
    )
}

export default HomePage;