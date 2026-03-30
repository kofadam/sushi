import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  CalendarDays, LayoutDashboard, Users, Shield,
  Megaphone, BarChart3, ClipboardCheck, LogOut, Menu, X, CalendarOff,
} from "lucide-react";
import { useState } from "react";

function NavItem({ to, icon: Icon, label, onClick }) {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors w-full text-right"
      >
        <Icon size={20} />
        <span className="text-sm font-medium">{label}</span>
      </button>
    );
  }
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
          isActive
            ? "bg-brand-600/20 text-brand-400"
            : "text-slate-400 hover:text-white hover:bg-slate-700/50"
        }`
      }
    >
      <Icon size={20} />
      <span className="text-sm font-medium">{label}</span>
    </NavLink>
  );
}

export function Layout({ children }) {
  const { user, logout, hasPerm } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "ראשי", show: true },
    { to: "/schedule", icon: CalendarDays, label: "משמרות", show: true },
    { to: "/special-days", icon: CalendarOff, label: "ימים מיוחדים", show: hasPerm("manage_schedule") },
    { to: "/announcements", icon: Megaphone, label: "הודעות", show: true },
    { to: "/polls", icon: BarChart3, label: "סקרים", show: true },
    { to: "/tasks", icon: ClipboardCheck, label: "משימות", show: true },
    { to: "/users", icon: Users, label: "עובדים", show: hasPerm("manage_users") },
    { to: "/roles", icon: Shield, label: "הרשאות", show: hasPerm("manage_roles") },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-64 bg-slate-900 flex flex-col transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white">Sushi</h1>
          <p className="text-xs text-slate-500 mt-1">SUpervisor of SHIfts</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => item.show)
            .map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold">
              {user?.first_name?.[0] || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user?.role_detail?.name_he || "—"}
              </p>
            </div>
          </div>
          <NavItem icon={LogOut} label="התנתק" onClick={handleLogout} />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:mr-64">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
          <h1 className="text-lg font-bold text-slate-900">Sushi</h1>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-slate-600 hover:text-slate-900"
          >
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Button({ children, variant = "primary", size = "md", className = "", ...props }) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-slate-600 hover:bg-slate-100",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3",
  };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Badge({ children, color = "blue" }) {
  const colors = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    yellow: "bg-yellow-100 text-yellow-800",
    red: "bg-red-100 text-red-800",
    gray: "bg-slate-100 text-slate-600",
    purple: "bg-purple-100 text-purple-800",
  };
  return (
    <span className={`badge ${colors[color] || colors.blue}`}>{children}</span>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-12">
      {Icon && <Icon size={48} className="mx-auto text-slate-300 mb-4" />}
      <h3 className="text-lg font-medium text-slate-900 mb-1">{title}</h3>
      {description && <p className="text-slate-500 mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );
}
