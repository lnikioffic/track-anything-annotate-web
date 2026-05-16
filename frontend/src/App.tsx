import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sidebar } from "./components/layout/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import VideoAnnotation from "./pages/VideoAnnotation";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Router>
      <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile header */}
          <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-card flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
              aria-label="Открыть меню"
            >
              <Menu size={20} />
            </button>
            <span className="font-bold text-primary text-lg">TrackAnnotate</span>
          </header>

          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/video" element={<VideoAnnotation />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
