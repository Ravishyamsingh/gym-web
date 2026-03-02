import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Users, CreditCard, Settings, LogOut } from "lucide-react";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Overview", end: true },
  { to: "/admin/members", icon: Users, label: "Members" },
  { to: "/admin/payments", icon: CreditCard, label: "Payments" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminLayout() {
  const { logout, dbUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-void">
      {/* ── Sidebar ─────────────────────────── */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/5 bg-surface">
        {/* Brand */}
        <div className="flex h-16 items-center px-6 border-b border-white/5">
          <span className="font-display text-2xl font-bold tracking-wider text-light">
            GYM<span className="text-blood">WEB</span>
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blood/10 text-blood"
                    : "text-white/60 hover:bg-white/5 hover:text-light"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-white/5 p-4">
          <p className="text-xs text-white/40 truncate">{dbUser?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-blood transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Mobile header ───────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex md:hidden h-14 items-center justify-between border-b border-white/5 bg-surface px-4">
          <span className="font-display text-xl font-bold tracking-wider text-light">
            GYM<span className="text-blood">WEB</span>
          </span>
          <button onClick={handleLogout} className="text-white/60 hover:text-blood">
            <LogOut size={18} />
          </button>
        </header>

        {/* ── Page content ──────────────────── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>

        {/* ── Mobile bottom nav ─────────────── */}
        <nav className="flex md:hidden border-t border-white/5 bg-surface">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
                  isActive ? "text-blood" : "text-white/40"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
