import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "@/App.css";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "@/pages/LoginPage";
import OwnerDashboardPage from "@/pages/OwnerDashboardPage";
import TransactionsPage from "@/pages/TransactionsPage";
import StocksPage from "@/pages/StocksPage";
import SyncSettingsPage from "@/pages/SyncSettingsPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "owner" ? "/owner/dashboard" : "/admin/transactions"} replace />;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" richColors closeButton />
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/owner/dashboard" element={<ProtectedRoute role="owner"><OwnerDashboardPage /></ProtectedRoute>} />
            <Route path="/admin/transactions" element={<ProtectedRoute role="admin"><TransactionsPage /></ProtectedRoute>} />
            <Route path="/admin/stocks" element={<ProtectedRoute role="admin"><StocksPage /></ProtectedRoute>} />
            <Route path="/admin/sync-settings" element={<ProtectedRoute role="admin"><SyncSettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
