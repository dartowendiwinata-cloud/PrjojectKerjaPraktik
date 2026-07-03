import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { API } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";

export default function SyncSettingsPage() {
  const [frekuensi, setFrekuensi] = useState("Setiap Hari");
  const [waktuEksekusi, setWaktuEksekusi] = useState("00:00");
  const [terakhir, setTerakhir] = useState(null);

  const load = useCallback(async () => {
    const res = await axios.get(`${API}/sync-settings`);
    setFrekuensi(res.data.frekuensi);
    setWaktuEksekusi((res.data.waktu_eksekusi || "00:00").slice(0, 5));
    setTerakhir(res.data.terakhir_sinkronisasi);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSaveSettings = async (e) => {
    e.preventDefault();
    await axios.put(`${API}/sync-settings`, { frekuensi, waktu_eksekusi: waktuEksekusi });
    toast.success("Pengaturan sinkronisasi berhasil disimpan.", {
      description: `${frekuensi} pukul ${waktuEksekusi} WIB`,
    });
  };

  const onRunSync = async () => {
    const res = await axios.post(`${API}/sync-settings/run`);
    setTerakhir(res.data.terakhir_sinkronisasi);
    toast.success("Sinkronisasi manual berhasil dijalankan.", {
      description: "Data dari semua sumber telah ditarik.",
    });
  };

  const formatTerakhir = (iso) => {
    if (!iso) return "Belum Pernah";
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  return (
    <AppLayout pageTitle="Kelola Jadwal Refresh Data" pageSubtitle="Atur sinkronisasi otomatis untuk dashboard penjualan">
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit" data-testid="schedule-card">
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                Pengaturan Jadwal Otomatis
              </h3>
            </div>
            <div className="p-6">
              <form onSubmit={onSaveSettings} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Frekuensi Sinkronisasi</label>
                  <select value={frekuensi} onChange={(e) => setFrekuensi(e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition-all duration-300 ease-in-out focus:border-blue-500" data-testid="form-frekuensi">
                    <option value="Setiap Hari">Setiap Hari</option>
                    <option value="Setiap Minggu">Setiap Minggu</option>
                    <option value="Setiap Bulan">Setiap Bulan</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Waktu Eksekusi (WIB)</label>
                  <input type="time" value={waktuEksekusi} onChange={(e) => setWaktuEksekusi(e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition-all duration-300 ease-in-out focus:border-blue-500" data-testid="form-waktu" />
                </div>
                <button type="submit" data-testid="save-settings-btn" className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-lg font-bold text-white shadow-lg shadow-blue-600/20 transition-all duration-300 ease-in-out hover:bg-blue-700">Simpan Pengaturan Jadwal</button>
              </form>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit" data-testid="manual-sync-card">
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                Sinkronisasi Manual
              </h3>
            </div>
            <div className="p-6 flex flex-col justify-between">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm uppercase tracking-[0.12em]" style={{ color: "#5f7ea8" }}>Status Sinkronisasi Terakhir</p>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Waktu Eksekusi Terakhir</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950" data-testid="terakhir-sinkronisasi">{formatTerakhir(terakhir)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Status</p>
                    <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-600">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      Sukses
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-6 mb-4">
                Gunakan tombol di bawah ini untuk menarik data terbaru dari semua sumber data secara manual (tanpa menunggu jadwal).
              </p>
              <button onClick={onRunSync} type="button" data-testid="run-sync-btn" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 py-4 text-lg font-bold text-white shadow-lg shadow-red-500/25 transition-all duration-300 ease-in-out hover:bg-red-600">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 6v5h-5" />
                  <path d="M4 18v-5h5" />
                  <path d="M7 9a7 7 0 0 1 11-2" />
                  <path d="M17 15a7 7 0 0 1-11 2" />
                </svg>
                Jalankan Sinkronisasi Sekarang
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
