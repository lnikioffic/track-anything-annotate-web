import { NavLink } from "react-router-dom";
import { Video, Image as ImageIcon, Home } from "lucide-react";
import { cn } from "../../lib/utils";

export const Sidebar = () => {
  return (
    <div className="w-64 bg-card border-r h-screen flex flex-col p-4">
      <div className="text-2xl font-bold text-primary mb-8 px-2">
        TrackAnnotate
      </div>
      <nav className="space-y-2">
        <NavLink
          to="/"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 px-4 py-3 rounded-lg transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )
          }
        >
          <Home size={20} /> Главная
        </NavLink>
        <NavLink
          to="/video"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 px-4 py-3 rounded-lg transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )
          }
        >
          <Video size={20} /> Разметка Видео
        </NavLink>
        <NavLink
          to="/photo"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 px-4 py-3 rounded-lg transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )
          }
        >
          <ImageIcon size={20} /> Разметка Фото
        </NavLink>
      </nav>
    </div>
  );
};
