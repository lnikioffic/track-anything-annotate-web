import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import VideoAnnotation from "./pages/VideoAnnotation";
import PhotoAnnotation from "./pages/PhotoAnnotation";

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-background text-foreground font-sans">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/video" element={<VideoAnnotation />} />
            <Route path="/photo" element={<PhotoAnnotation />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
