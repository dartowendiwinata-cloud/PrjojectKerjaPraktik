import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ICONS = {
  "chart-bar": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19h16" />
      <path d="M7 16V9" />
      <path d="M12 16V5" />
      <path d="M17 16v-3" />
    </svg>
  ),
  receipt: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 3h10l2 2v14l-2-1-2 1-2-1-2 1-2-1-2 1V5l2-2z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
    </svg>
  ),
  database: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </svg>
  ),
  "archive-box": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16v3H4z" />
      <path d="M6 10h12v9H6z" />
      <path d="M10 14h4" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </svg>
  ),
};

const OWNER_NAV = [{ label: "Dashboard Penjualan", to: "/owner/dashboard", icon: "chart-bar" }];
const ADMIN_NAV = [
  { label: "Kelola Transaksi", to: "/admin/transactions", icon: "receipt" },
  { label: "Kelola Stok", to: "/admin/stocks", icon: "archive-box" },
  { label: "Jadwal Refresh", to: "/admin/sync-settings", icon: "clock" },
];

export default function AppLayout({ children, pageTitle, pageSubtitle, hideTopPageTitle }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isOwner = user?.role === "owner";
  const navItems = isOwner ? OWNER_NAV : ADMIN_NAV;
  const sidebarBg = isOwner ? "bg-slate-900" : "bg-red-950";
  const headerBg = isOwner ? "bg-blue-600" : "bg-red-600";
  const panelTitle = isOwner ? "PEMILIK PANEL" : "ADMIN PANEL";

  const activeNavClass = isOwner ? "bg-blue-600 text-white shadow-lg" : "bg-red-600 text-white shadow-lg";
  const inactiveNavClass = "text-slate-300 hover:bg-slate-800 hover:text-white";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside
        className={`fixed inset-y-0 left-0 w-64 ${sidebarBg} text-white flex flex-col justify-between h-screen flex-shrink-0 shadow-2xl`}
        data-testid="app-sidebar"
      >
        <div>
          <div className={`${headerBg} text-white p-5 flex items-center justify-center`}>
            <div className="flex items-center gap-3">
              <img src="/LogoAbahOrchid.png" alt="Logo Abah Orchid" className="h-9 w-9 object-contain" />
              <div>
                <p className="text-xl font-bold text-white">{panelTitle}</p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">Abah Orchid</p>
              </div>
            </div>
          </div>

          <div className="px-6 pt-8 pb-4">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
              {isOwner ? "Menu Analisis" : "Menu Utama"}
            </p>
          </div>

          <nav className="px-3 space-y-2" data-testid="sidebar-nav">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  data-testid={`nav-${item.to.split("/").pop()}`}
                  className={`${active ? activeNavClass : inactiveNavClass} flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ease-in-out`}
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                    {ICONS[item.icon]}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-6 mb-4">
          <button
            onClick={logout}
            data-testid="logout-btn"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-white hover:bg-white/10 transition-all duration-300 ease-in-out"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M15 17l5-5-5-5" />
                <path d="M20 12H9" />
                <path d="M13 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8" />
              </svg>
            </span>
            <span className="text-sm font-semibold">Logout</span>
          </button>
        </div>
      </aside>

      <main className="ml-64 flex-1 overflow-y-auto">
        <header className="bg-white px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Sistem Analisis Eksekutif</h2>
            <p className="text-xs text-gray-500">Ringkasan KPI, Analisis Tren, dan Prediksi</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800" data-testid="user-name">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 19a7 7 0 0 1 14 0" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </span>
          </div>
        </header>

        <div className="min-h-full p-6">
          {!hideTopPageTitle && pageTitle && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
              {pageSubtitle && <p className="text-sm text-gray-500">{pageSubtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
