import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { API } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import ConfirmDialog from "@/components/ConfirmDialog";

const UNITS = ["Pcs", "Box", "Unit", "Lusin", "Pack"];

export default function StocksPage() {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState({});
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ kategori: "", nama_barang: "", jumlah_stok: "", satuan: "Pcs" });
  const [errors, setErrors] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = useCallback(async (q = "") => {
    const res = await axios.get(`${API}/stocks`, { params: { search: q } });
    setItems(res.data);
  }, []);

  useEffect(() => {
    (async () => {
      const res = await axios.get(`${API}/products`);
      setProducts(res.data);
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  const categories = Object.keys(products);
  const productsForCategory = form.kategori ? products[form.kategori] || [] : [];

  const resetForm = () => {
    setForm({ kategori: "", nama_barang: "", jumlah_stok: "", satuan: "Pcs" });
    setEditingId(null);
    setShowForm(false);
    setErrors({});
  };

  const onKategoriChange = (newCat) => {
    const first = (products[newCat] || [])[0];
    setForm((f) => ({
      ...f,
      kategori: newCat,
      nama_barang: first?.nama || "",
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.kategori) errs.kategori = "Kategori wajib dipilih";
    if (!form.nama_barang) errs.nama_barang = "Nama barang wajib dipilih";
    if (form.jumlah_stok === "" || Number(form.jumlah_stok) < 0) errs.jumlah_stok = "Jumlah stok tidak valid";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const payload = {
      nama_barang: form.nama_barang,
      jumlah_stok: Number(form.jumlah_stok),
      satuan: form.satuan,
    };

    try {
      if (editingId) {
        await axios.put(`${API}/stocks/${editingId}`, payload);
        toast.success("Stok berhasil diperbarui.", { description: editingId });
      } else {
        const res = await axios.post(`${API}/stocks`, payload);
        toast.success("Stok berhasil ditambahkan.", { description: res.data?.id });
      }
      resetForm();
      load(search);
    } catch (err) {
      const msg = err.response?.data?.detail || "Terjadi kesalahan.";
      toast.error("Gagal menyimpan stok", { description: msg });
    }
  };

  const onEdit = (item) => {
    // Cari kategori barang dari product catalog
    let foundKategori = "";
    for (const [cat, prods] of Object.entries(products)) {
      if (prods.some((p) => p.nama.toLowerCase() === item.nama_barang.toLowerCase())) {
        foundKategori = cat;
        break;
      }
    }
    setEditingId(item.id);
    setForm({
      kategori: foundKategori,
      nama_barang: item.nama_barang,
      jumlah_stok: String(item.jumlah_stok),
      satuan: item.satuan,
    });
    setShowForm(true);
  };

  const onDelete = async () => {
    if (!pendingDelete) return;
    try {
      await axios.delete(`${API}/stocks/${pendingDelete.id}`);
      toast.success("Stok berhasil dihapus.", { description: pendingDelete.id });
      setPendingDelete(null);
      load(search);
    } catch (err) {
      const msg = err.response?.data?.detail || "Gagal menghapus stok.";
      toast.error("Gagal menghapus", { description: msg });
    }
  };

  return (
    <AppLayout pageTitle="Mengelola Stok Data" pageSubtitle="Pemantauan inventaris barang dan material">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari barang..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm outline-none focus:border-blue-500 focus:bg-white"
              data-testid="search-input"
            />
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            data-testid="create-btn"
            className="rounded-2xl bg-red-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-red-500/25 hover:bg-red-600 transition-all"
          >
            + Tambah Stok
          </button>
        </div>

        {showForm && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm" data-testid="stock-form">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-950">{editingId ? "Edit Stok" : "Tambah Stok"}</h2>
              <button onClick={resetForm} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">Tutup</button>
            </div>
            <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-2">

              {/* Kategori */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Kategori</label>
                <select
                  value={form.kategori}
                  onChange={(e) => onKategoriChange(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  data-testid="form-kategori"
                >
                  <option value="">— Pilih kategori —</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {errors.kategori && <p className="mt-2 text-sm text-red-500">{errors.kategori}</p>}
              </div>

              {/* Nama Barang */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Nama Barang</label>
                <select
                  value={form.nama_barang}
                  onChange={(e) => setForm((f) => ({ ...f, nama_barang: e.target.value }))}
                  disabled={!form.kategori}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 disabled:opacity-50"
                  data-testid="form-nama-barang"
                >
                  <option value="">— Pilih barang —</option>
                  {productsForCategory.map((p) => (
                    <option key={p.nama} value={p.nama}>{p.nama}</option>
                  ))}
                </select>
                {errors.nama_barang && <p className="mt-2 text-sm text-red-500">{errors.nama_barang}</p>}
              </div>

              {/* Jumlah Stok */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Jumlah Stok</label>
                <input
                  type="number"
                  value={form.jumlah_stok}
                  onChange={(e) => setForm({ ...form, jumlah_stok: e.target.value })}
                  min="0"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  data-testid="form-jumlah-stok"
                />
                {errors.jumlah_stok && <p className="mt-2 text-sm text-red-500">{errors.jumlah_stok}</p>}
              </div>

              {/* Satuan */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Satuan</label>
                <select
                  value={form.satuan}
                  onChange={(e) => setForm({ ...form, satuan: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  data-testid="form-satuan"
                >
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              {/* Tombol */}
              <div className="lg:col-span-2 flex items-center gap-3">
                <button type="submit" data-testid="form-submit" className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">Simpan</button>
                <button type="button" onClick={resetForm} className="rounded-2xl bg-slate-100 px-5 py-3 font-semibold text-slate-600">Batal</button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-sm font-black uppercase tracking-wide text-slate-700">
                <tr>
                  <th className="px-6 py-5">Kode Barang</th>
                  <th className="px-6 py-5">Nama Barang</th>
                  <th className="px-6 py-5">Jumlah Stok</th>
                  <th className="px-6 py-5">Satuan</th>
                  <th className="px-6 py-5">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-base text-slate-700" data-testid="stocks-tbody">
                {items.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400">Belum ada data stok.</td></tr>
                ) : items.map((item) => (
                  <tr key={item.id} data-testid={`row-${item.id}`}>
                    <td className="px-6 py-5 font-bold text-slate-900">{item.id}</td>
                    <td className="px-6 py-5">{item.nama_barang}</td>
                    <td className="px-6 py-5">
                      <span className={`${item.jumlah_stok <= 50 ? "bg-red-50 text-red-500" : "text-slate-900"} rounded-xl px-3 py-2 font-bold`}>
                        {item.jumlah_stok}
                      </span>
                    </td>
                    <td className="px-6 py-5">{item.satuan}</td>
                    <td className="px-6 py-5">
                      <div className="flex gap-3">
                        <button onClick={() => onEdit(item)} data-testid={`edit-${item.id}`} className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-100">Edit</button>
                        <button onClick={() => setPendingDelete(item)} data-testid={`delete-${item.id}`} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-100">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Hapus Stok?"
        description={
          pendingDelete
            ? `Tindakan ini akan menghapus stok ${pendingDelete.id} (${pendingDelete.nama_barang}). Aksi tidak dapat dibatalkan.`
            : ""
        }
        onConfirm={onDelete}
        testId="delete-stock-dialog"
      />
    </AppLayout>
  );
}
