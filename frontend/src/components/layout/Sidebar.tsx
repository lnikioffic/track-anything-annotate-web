import { NavLink, useNavigate } from "react-router-dom";
import { Video, Home, X } from "lucide-react";
import { cn } from "../../lib/utils";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const navigate = useNavigate();

  const handleNav = (to: string) => {
    navigate(to);
    onClose?.();
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          "w-fit bg-card border-r h-screen flex-col p-4 z-50 flex-shrink-0",
          // desktop: always visible inline
          "hidden md:flex",
          // mobile: fixed drawer, shown when open
          isOpen && "fixed inset-y-0 left-0 flex",
        )}
      >
        <div className="flex items-center justify-between mb-8 px-2 gap-4">
          <span className="text-xl font-bold text-primary whitespace-nowrap">
            TrackAnnotate
          </span>
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded hover:bg-muted transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="space-y-1">
          {[
            { to: "/", icon: <Home size={18} />, label: "Главная" },
            { to: "/video", icon: <Video size={18} />, label: "Разметка Видео" },
          ].map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => onClose?.()}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )
              }
            >
              {icon} {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
};
