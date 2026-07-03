import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import {
  Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, ComposedChart,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const PERIODS = {
  current_month: "Bulan Ini",
  current_quarter: "Kuartal Ini",
  current_year: "Tahun Ini",
  previous_year: "Tahun Lalu",
};

const KPI_ICON_STYLES = {
  currency: "bg-blue-50 text-blue-600",
  pulse: "bg-rose-50 text-rose-500",
  box: "bg-emerald-50 text-emerald-500",
  users: "bg-violet-50 text-violet-500",
};

function KpiIcon({ name }) {
  const cls = "w-5 h-5";
  switch (name) {
    case "currency":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3v18" />
          <path d="M17 7.5c0-1.9-2.2-3.5-5-3.5s-5 1.6-5 3.5 2.2 3.5 5 3.5 5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5" />
        </svg>
      );
    case "pulse":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 12h4l2.5-5 4 10 2.5-5H21" />
        </svg>
      );
    case "box":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7.5 12 3l8 4.5-8 4.5-8-4.5Z" />
          <path d="M4 7.5V16.5L12 21l8-4.5V7.5" />
          <path d="M12 12v9" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
          <path d="M3 19a5 5 0 0 1 5-5h1" />
          <path d="M21 19a5 5 0 0 0-5-5h-1" />
        </svg>
      );
  }
}

const formatRupiah = (n) => new Intl.NumberFormat("id-ID").format(n);

export default function OwnerDashboardPage() {
  const [period, setPeriod] = useState("current_year");
  const [stats, setStats] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [showDrillDown, setShowDrillDown] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const dashboardRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [s, c] = await Promise.all([
        axios.get(`${API}/dashboard/stats?period=${period}`),
        axios.get(`${API}/dashboard/chart?period=${period}`),
      ]);
      if (!cancelled) {
        setStats(s.data);
        setChartData(c.data);
      }
    })();
    return () => { cancelled = true; };
  }, [period]);

  const trendData = chartData
    ? chartData.trend.labels.map((label, i) => ({
        label,
        actual: chartData.trend.actual[i],
        forecast: chartData.trend.forecast[i],
      }))
    : [];

  const categoryData = chartData
    ? chartData.categories.labels.map((label, i) => ({
        label,
        value: chartData.categories.values[i],
      }))
    : [];

  const exportPDF = async () => {
    setShowExportMenu(false);
    const el = dashboardRef.current;
    if (!el) return;
    const canvas = await html2canvas(el, { backgroundColor: "#f1f5f9", scale: 2 });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
    pdf.save(`dashboard_abah_orchid_${Date.now()}.pdf`);
  };

  const exportJPG = async () => {
    setShowExportMenu(false);
    const el = dashboardRef.current;
    if (!el) return;
    const canvas = await html2canvas(el, { backgroundColor: "#f1f5f9", scale: 2 });
    const link = document.createElement("a");
    link.download = `dashboard_abah_orchid_${Date.now()}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
  };

  const exportCSV = () => {
    setShowExportMenu(false);
    if (!chartData) return;
    const rows = [["Bulan", "Aktual", "Prediksi", "Varian"]];
    trendData.forEach((row) => {
      rows.push([row.label, row.actual, row.forecast, row.actual - row.forecast]);
    });
    rows.push([]);
    rows.push(["Kategori", "Total"]);
    categoryData.forEach((c) => rows.push([c.label, c.value]));
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `dashboard_abah_orchid_${Date.now()}.csv`;
    link.click();
  };

  return (
    <AppLayout pageTitle="Dashboard Visualisasi Penjualan" hideTopPageTitle>
      <div ref={dashboardRef} className="space-y-6" data-testid="owner-dashboard">
        <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard Visualisasi Penjualan</h1>
            <p className="text-gray-500 text-sm">Ringkasan KPI, Analisis Tren, dan Prediksi</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 5h16l-6 7v6l-4-2v-4L4 5z" />
              </svg>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                data-testid="period-select"
                className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm text-gray-700 shadow-sm outline-none transition hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {Object.entries(PERIODS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                data-testid="export-btn"
                className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-800 shadow-sm cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3v12" />
                  <path d="M8 11l4 4 4-4" />
                  <path d="M5 21h14" />
                </svg>
                Ekspor Laporan
              </button>
              {showExportMenu && (
                <div className="absolute right-0 z-10 mt-3 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm" data-testid="export-menu">
                  <button onClick={exportPDF} data-testid="export-pdf-btn" className="block w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50">Ekspor sebagai PDF</button>
                  <button onClick={exportJPG} data-testid="export-jpg-btn" className="block w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50">Ekspor sebagai Image (JPG)</button>
                  <button onClick={exportCSV} data-testid="export-csv-btn" className="block w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50">Ekspor sebagai CSV</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm xl:min-h-[140px]" data-testid={`kpi-${stat.icon}`}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 text-sm font-medium text-gray-500">{stat.label}</h3>
                <div className={`shrink-0 rounded-lg p-2 ${KPI_ICON_STYLES[stat.icon] || "bg-slate-50 text-slate-600"}`}>
                  <KpiIcon name={stat.icon} />
                </div>
              </div>
              <div className="mt-3 min-w-0">
                <h2 className="truncate text-xl font-bold text-gray-800 2xl:text-2xl">{stat.value}</h2>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div className="flex h-10 w-16 items-end overflow-hidden">
                  <svg viewBox="0 0 64 40" className={`w-16 h-10 ${stat.positive ? "text-emerald-500" : "text-red-500"}`} fill="none">
                    {stat.positive ? (
                      <path d="M2 30C10 30 14 14 22 14C30 14 34 24 42 24C50 24 54 8 62 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <path d="M2 10C10 10 14 26 22 26C30 26 34 16 42 16C50 16 54 32 62 32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                  </svg>
                </div>
                <div className="min-w-0 text-right text-[11px] leading-4 sm:text-xs">
                  <div className={`font-bold ${stat.change === "—" ? "text-slate-400" : stat.positive ? "text-green-500" : "text-red-500"}`}>
                    {stat.change === "—" ? "—" : `${stat.positive ? "+" : "-"}${stat.change}`}
                  </div>
                  <div className="truncate text-gray-400">dari {stat.compare_label || "periode lalu"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col" data-testid="trend-chart-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-gray-900">Tren Penjualan & Forecasting</h2>
              <button onClick={() => setShowDrillDown(!showDrillDown)} className="text-blue-600 text-sm cursor-pointer hover:underline" data-testid="drill-down-toggle">
                {showDrillDown ? "Sembunyikan Drill Down" : "Gunakan Drill Down"}
              </button>
            </div>
            <div className="mt-6 w-full" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748b" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                  <Tooltip
                    formatter={(value, name) => [`Rp ${formatRupiah(value)}`, name === "actual" ? "Penjualan Aktual" : "Forecast"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Area type="monotone" dataKey="actual" stroke="#2563eb" strokeWidth={3} fill="url(#actualGrad)" />
                  <Line type="monotone" dataKey="forecast" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 6" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {showDrillDown && (
              <div className="mt-6 border-t pt-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead className="text-sm font-bold text-gray-900">
                      <tr>
                        <th className="px-4 py-3">Bulan</th>
                        <th className="px-4 py-3">Aktual</th>
                        <th className="px-4 py-3">Prediksi</th>
                        <th className="px-4 py-3">Varian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
                      {trendData.map((row) => {
                        const variance = row.actual - row.forecast;
                        return (
                          <tr key={row.label}>
                            <td className="px-4 py-3 font-medium text-gray-900">{row.label}</td>
                            <td className="px-4 py-3">{formatRupiah(row.actual)}</td>
                            <td className="px-4 py-3">{formatRupiah(row.forecast)}</td>
                            <td className={`px-4 py-3 ${variance >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                              {variance >= 0 ? "+" : ""}{formatRupiah(variance)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm" data-testid="category-chart-card">
            <h2 className="text-xl font-bold text-gray-900">Penjualan per Kategori</h2>
            <div className="mt-6 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#64748b" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} stroke="#64748b" width={110} interval={0} />
                  <Tooltip formatter={(v) => `Rp ${formatRupiah(v)}`} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="value" fill="#e02424" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
