import { Suspense, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { HomePage, MeetingPage } from "./routes/Routes";
import Loader from "./components/Loader";
import { Toaster } from "react-hot-toast"
import Header from "./components/Header";
import { CodeContext } from "./contexts/CodeContext";

const App = () => {
  const [codingStarted, setCodingStarted] = useState(false);
  return (
    <>
      <div className="min-h-screen bg-white dark:bg-[linear-gradient(180deg,#3b3b3b,#111112)] text-black dark:text-white">
        <CodeContext.Provider value={{ codingStarted, setCodingStarted }}>
          <Header />
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route exact path="/" element={<HomePage />} />
              <Route exact path="/meeting/:id" element={<MeetingPage />} />
            </Routes>
          </Suspense>
        </CodeContext.Provider>
        <Toaster />
      </div>
    </>
  )
}

export default App;