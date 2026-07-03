import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={user.role === "owner" ? "/owner/dashboard" : "/admin/transactions"} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await login(identity, password);
      navigate(u.role === "owner" ? "/owner/dashboard" : "/admin/transactions", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen px-4 py-12"
      style={{
        background:
          "radial-gradient(circle at top, rgba(37,99,235,0.08), transparent 35%), linear-gradient(180deg, #edf4ff 0%, #e8f0fb 100%)",
      }}
    >
      <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
        <div
          className="w-full max-w-lg overflow-hidden rounded-[2rem] bg-white transition-all duration-300 ease-in-out"
          style={{ boxShadow: "0 32px 80px rgba(15,23,42,0.18)" }}
        >
          <div className="h-2 bg-gradient-to-r from-red-500 via-red-400 to-red-500" />

          <div className="space-y-8 px-8 py-10 sm:px-12">
            <div className="text-center">
              <img
                src="/LogoAbahOrchid.png"
                alt="Logo Abah Orchid"
                className="mx-auto mb-4 h-auto w-20 transition-all duration-300 ease-in-out hover:-translate-y-1"
                data-testid="login-logo"
              />
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Sistem Dashboard</h1>
              <p className="mt-2 text-base text-slate-500">Silakan login ke akun Anda</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
              <div>
                <label htmlFor="identity" className="mb-2 block text-sm font-medium text-slate-800">
                  Username
                </label>
                <input
                  id="identity"
                  type="text"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  placeholder="admin / owner / email"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base outline-none ring-0 transition-all duration-300 ease-in-out focus:border-blue-500 focus:bg-white"
                  data-testid="login-identity-input"
                />
                <p className="mt-2 text-sm text-slate-400">Petunjuk: ketik &quot;admin&quot; atau &quot;owner&quot;.</p>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-800">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base outline-none ring-0 transition-all duration-300 ease-in-out focus:border-slate-900 focus:bg-white"
                  data-testid="login-password-input"
                />
              </div>

              {error && (
                <p className="text-sm font-medium text-red-500" data-testid="login-error">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-red-500 px-6 py-4 text-lg font-medium text-white shadow-lg shadow-red-500/30 transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-red-600 hover:shadow-xl disabled:opacity-60"
                data-testid="login-submit-btn"
              >
                {loading ? "Memuat..." : "Masuk"}
              </button>
            </form>

            <div className="rounded-3xl bg-slate-50 p-5 text-sm text-slate-500">
              <p className="font-medium text-slate-700">Akun demo</p>
              <p className="mt-1">
                Owner: <span className="font-medium">owner@company.com</span>
              </p>
              <p>
                Admin: <span className="font-medium">admin@company.com</span>
              </p>
              <p>
                Password: <span className="font-medium">password</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
