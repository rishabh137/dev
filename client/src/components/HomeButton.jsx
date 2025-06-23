const HomeButton = ({ setOpenMeetLinkModal }) => {
    return (
        <>
            <button
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold px-6 py-3 rounded-md shadow-md transition cursor-pointer"
                onClick={() => setOpenMeetLinkModal(true)}
            >
                New Meeting
            </button>
        </>
    )
}

export default HomeButton;