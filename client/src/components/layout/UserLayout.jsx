import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Home, ScanFace, LogOut } from "lucide-react";

/**
 * Mobile-optimised shell for the user-facing pages.
 * Bottom tab bar for one-thumb reach (as specified in the design doc).
 */
export default function UserLayout({ children }) {
  const { logout, dbUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-void">
      {/* ── Top bar (minimal) ─────────────── */}
      <header className="flex h-14 items-center justify-between border-b border-white/5 bg-surface px-4">
        <span className="font-display text-xl font-bold tracking-wider text-light">
          GYM<span className="text-blood">WEB</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40 hidden sm:inline">{dbUser?.name}</span>
          <button onClick={handleLogout} className="text-white/60 hover:text-blood transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* ── Content ───────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4">{children}</main>

      {/* ── Bottom nav (mobile-first) ─────── */}
      <nav className="flex border-t border-white/5 bg-surface safe-bottom">
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
              isActive ? "text-blood" : "text-white/40"
            }`
          }
        >
          <Home size={20} />
          Home
        </NavLink>
        <NavLink
          to="/verify"
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
              isActive ? "text-blood" : "text-white/40"
            }`
          }
        >
          <ScanFace size={20} />
          Verify
        </NavLink>
      </nav>
    </div>
  );
}
