import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { API } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import TransactionDetailDialog from "@/components/TransactionDetailDialog";

const PAGE_SIZE = 10;

const formatRp = (n) => new Intl.NumberFormat("id-ID").format(n);
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function TransactionsPage() {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState({});
  const [stocks, setStocks] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    tanggal: todayStr(),
    kategori: "",
    nama_barang: "",
    harga_satuan: 0,
    quantity: 1,
  });
  const [errors, setErrors] = useState({});
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [detailItem, setDetailItem] = useState(null);

  const load = useCallback(async (q = "") => {
    const res = await axios.get(`${API}/transactions`, { params: { search: q } });
    setItems(res.data);
  }, []);

  const loadStocks = useCallback(async () => {
    const res = await axios.get(`${API}/stocks`);
    setStocks(res.data);
  }, []);

  useEffect(() => {
    (async () => {
      const res = await axios.get(`${API}/products`);
      setProducts(res.data);
    })();
    loadStocks();
  }, [loadStocks]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const categories = useMemo(() => Object.keys(products), [products]);
  const productsForCategory = useMemo(
    () => (form.kategori ? products[form.kategori] || [] : []),
    [products, form.kategori]
  );
  const total = useMemo(
    () => Number(form.harga_satuan || 0) * Number(form.quantity || 0),
    [form.harga_satuan, form.quantity]
  );

  // Cari stok saat ini untuk barang yang dipilih di form
  const selectedStock = useMemo(() => {
    if (!form.nama_barang) return null;
    return stocks.find(
      (s) => s.nama_barang.toLowerCase() === form.nama_barang.toLowerCase()
    ) || null;
  }, [stocks, form.nama_barang]);

  // Stok tersedia mempertimbangkan qty transaksi yang sedang diedit
  const availableStock = useMemo(() => {
    if (!selectedStock) return null;
    if (!editingId) return selectedStock.jumlah_stok;
    // Saat edit: stok akan dikembalikan dulu, jadi tampilkan stok + qty lama
    const existing = items.find((i) => i.id === editingId);
    if (!existing) return selectedStock.jumlah_stok;
    const m = existing.keterangan.match(/^(.+) x(\d+)$/);
    const oldNama = m?.[1]?.toLowerCase() || "";
    const oldQty = m ? Number(m[2]) : 1;
    if (oldNama === form.nama_barang.toLowerCase()) {
      return selectedStock.jumlah_stok + oldQty;
    }
    return selectedStock.jumlah_stok;
  }, [selectedStock, editingId, items, form.nama_barang]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const startIdx = (page - 1) * PAGE_SIZE;
    return items.slice(startIdx, startIdx + PAGE_SIZE);
  }, [items, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const resetForm = () => {
    setForm({ tanggal: todayStr(), kategori: "", nama_barang: "", harga_satuan: 0, quantity: 1 });
    setEditingId(null);
    setShowForm(false);
    setErrors({});
  };

  const onCreate = () => {
    resetForm();
    const firstCat = Object.keys(products)[0] || "";
    const firstProd = (products[firstCat] || [])[0];
    setForm({
      tanggal: todayStr(),
      kategori: firstCat,
      nama_barang: firstProd?.nama || "",
      harga_satuan: firstProd?.harga || 0,
      quantity: 1,
    });
    setShowForm(true);
  };

  const onEdit = (item) => {
    const cat = item.kategori;
    const catProducts = products[cat] || [];
    const m = item.keterangan.match(/^(.+) x(\d+)$/);
    let nama = m?.[1] || "";
    const qty = m ? Number(m[2]) : 1;
    const prod = catProducts.find((p) => p.nama === nama) || catProducts[0];
    setEditingId(item.id);
    setForm({
      tanggal: item.tanggal,
      kategori: cat,
      nama_barang: prod?.nama || nama,
      harga_satuan: prod?.harga || Math.round(item.total / qty),
      quantity: qty,
    });
    setShowForm(true);
  };

  const onKategoriChange = (newCat) => {
    const list = products[newCat] || [];
    const first = list[0];
    setForm((f) => ({
      ...f,
      kategori: newCat,
      nama_barang: first?.nama || "",
      harga_satuan: first?.harga || 0,
    }));
  };

  const onNamaBarangChange = (nama) => {
    const found = (products[form.kategori] || []).find((p) => p.nama === nama);
    setForm((f) => ({ ...f, nama_barang: nama, harga_satuan: found?.harga || 0 }));
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await axios.delete(`${API}/transactions/${pendingDelete.id}`);
      toast.success("Transaksi berhasil dihapus.", { description: pendingDelete.id });
      setPendingDelete(null);
      load(search);
      loadStocks();
    } catch (err) {
      const msg = err.response?.data?.detail || "Gagal menghapus transaksi.";
      toast.error("Gagal menghapus", { description: msg });
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.tanggal) errs.tanggal = "Tanggal wajib diisi";
    if (!form.kategori) errs.kategori = "Kategori wajib dipilih";
    if (!form.nama_barang) errs.nama_barang = "Nama barang wajib dipilih";
    if (!form.quantity || Number(form.quantity) < 1) errs.quantity = "Quantity minimal 1";

    // Validasi stok di sisi client (jika barang ada di inventaris)
    if (availableStock !== null && Number(form.quantity) > availableStock) {
      errs.quantity = `Stok tidak mencukupi. Tersedia: ${availableStock} ${selectedStock?.satuan || ""}`;
    }

    if (Object.keys(errs).length) { setErrors(errs); return; }

    const payload = {
      tanggal: form.tanggal,
      kategori: form.kategori,
      keterangan: `${form.nama_barang} x${form.quantity}`,
      total: Number(form.harga_satuan) * Number(form.quantity),
    };

    try {
      if (editingId) {
        await axios.put(`${API}/transactions/${editingId}`, payload);
        toast.success("Transaksi berhasil diperbarui.", { description: editingId });
      } else {
        const res = await axios.post(`${API}/transactions`, payload);
        toast.success("Transaksi berhasil ditambahkan.", { description: res.data?.id });
      }
      resetForm();
      load(search);
      loadStocks(); // refresh stok setelah transaksi berhasil
    } catch (err) {
      const msg = err.response?.data?.detail || "Terjadi kesalahan.";
      // Tampilkan error stok tidak cukup dari server
      if (err.response?.status === 400) {
        setErrors((prev) => ({ ...prev, quantity: msg }));
      } else {
        toast.error("Gagal menyimpan transaksi", { description: msg });
      }
    }
  };

  const pageNumbers = useMemo(() => {
    const arr = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [page, totalPages]);

  // Warna indikator stok di form
  const stockBadgeClass =
    availableStock === null
      ? "text-slate-400"
      : availableStock === 0
      ? "text-red-600 font-bold"
      : availableStock <= 10
      ? "text-orange-500 font-semibold"
      : "text-green-600 font-semibold";

  return (
    <AppLayout pageTitle="Kelola Data Transaksi" pageSubtitle="Manajemen data transaksi keuangan sistem">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari transaksi..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm outline-none focus:border-blue-500 focus:bg-white"
              data-testid="search-input"
            />
          </div>
          <button onClick={onCreate} data-testid="create-btn" className="rounded-2xl bg-red-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-red-500/25 hover:bg-red-600 transition-all">
            + Tambah Transaksi
          </button>
        </div>

        {showForm && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm" data-testid="transaction-form">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-950">{editingId ? "Edit Transaksi" : "Tambah Transaksi"}</h2>
              <button onClick={resetForm} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">Tutup</button>
            </div>
            <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Tanggal</label>
                <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" data-testid="form-tanggal" />
                {errors.tanggal && <p className="mt-2 text-sm text-red-500">{errors.tanggal}</p>}
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Kategori</label>
                <select value={form.kategori} onChange={(e) => onKategoriChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" data-testid="form-kategori">
                  <option value="">— Pilih kategori —</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.kategori && <p className="mt-2 text-sm text-red-500">{errors.kategori}</p>}
              </div>
              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Nama Barang</label>
                <select
                  value={form.nama_barang}
                  onChange={(e) => onNamaBarangChange(e.target.value)}
                  disabled={!form.kategori}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 disabled:opacity-50"
                  data-testid="form-nama-barang"
                >
                  <option value="">— Pilih barang —</option>
                  {productsForCategory.map((p) => (
                    <option key={p.nama} value={p.nama}>
                      {p.nama} — Rp {formatRp(p.harga)}
                    </option>
                  ))}
                </select>
                {errors.nama_barang && <p className="mt-2 text-sm text-red-500">{errors.nama_barang}</p>}

                {/* Indikator stok */}
                {form.nama_barang && (
                  <p className={`mt-2 text-xs ${stockBadgeClass}`} data-testid="stock-indicator">
                    {availableStock === null
                      ? "Barang ini tidak tercatat di inventaris"
                      : availableStock === 0
                      ? "⚠ Stok habis!"
                      : `Stok tersedia: ${availableStock} ${selectedStock?.satuan || ""}`}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Harga Satuan</label>
                <div className="flex h-[52px] items-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700" data-testid="form-harga-satuan">
                  Rp {formatRp(form.harga_satuan || 0)}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max={availableStock !== null ? availableStock : undefined}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  data-testid="form-quantity"
                />
                {errors.quantity && <p className="mt-2 text-sm text-red-500">{errors.quantity}</p>}
              </div>
              <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 px-5 py-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Total</p>
                  <p className="mt-1 text-2xl font-bold text-blue-700" data-testid="form-total-display">
                    Rp {formatRp(total)}
                  </p>
                  <p className="mt-1 text-xs text-blue-500">
                    {formatRp(form.harga_satuan || 0)} × {form.quantity || 0}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button type="submit" data-testid="form-submit" className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700">Simpan</button>
                  <button type="button" onClick={resetForm} className="rounded-2xl bg-slate-100 px-6 py-3 font-semibold text-slate-600">Batal</button>
                </div>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-sm font-black uppercase tracking-wide text-slate-700">
                <tr>
                  <th className="px-6 py-5">ID</th>
                  <th className="px-6 py-5">Tanggal</th>
                  <th className="px-6 py-5">Keterangan</th>
                  <th className="px-6 py-5">Kategori</th>
                  <th className="px-6 py-5">Total (Rp)</th>
                  <th className="px-6 py-5">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-base text-slate-700" data-testid="transactions-tbody">
                {pageItems.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">Belum ada data transaksi.</td></tr>
                ) : pageItems.map((item) => (
                  <tr key={item.id} data-testid={`row-${item.id}`}>
                    <td className="px-6 py-5 font-bold text-slate-900">{item.id}</td>
                    <td className="px-6 py-5">{item.tanggal}</td>
                    <td className="px-6 py-5">{item.keterangan}</td>
                    <td className="px-6 py-5">{item.kategori}</td>
                    <td className="px-6 py-5 font-bold text-slate-900">{formatRp(item.total)}</td>
                    <td className="px-6 py-5">
                      <div className="flex gap-3">
                        <button onClick={() => setDetailItem(item)} data-testid={`detail-${item.id}`} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">Detail</button>
                        <button onClick={() => onEdit(item)} data-testid={`edit-${item.id}`} className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-100">Edit</button>
                        <button onClick={() => setPendingDelete(item)} data-testid={`delete-${item.id}`} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-100">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {items.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row" data-testid="pagination">
              <p className="text-sm text-slate-500" data-testid="pagination-info">
                Menampilkan <span className="font-semibold text-slate-700">{(page - 1) * PAGE_SIZE + 1}</span>
                {" "}-{" "}
                <span className="font-semibold text-slate-700">{Math.min(page * PAGE_SIZE, items.length)}</span>
                {" "}dari{" "}
                <span className="font-semibold text-slate-700">{items.length}</span>{" "}transaksi
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} data-testid="pagination-prev" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">‹ Sebelumnya</button>
                {pageNumbers.map((n) => (
                  <button key={n} onClick={() => setPage(n)} data-testid={`pagination-page-${n}`} className={`min-w-[36px] rounded-xl px-3 py-2 text-sm font-semibold ${n === page ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{n}</button>
                ))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} data-testid="pagination-next" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">Berikutnya ›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Hapus Transaksi?"
        description={pendingDelete ? `Tindakan ini akan menghapus transaksi ${pendingDelete.id} (${pendingDelete.keterangan}). Aksi tidak dapat dibatalkan.` : ""}
        onConfirm={confirmDelete}
        testId="delete-transaction-dialog"
      />

      <TransactionDetailDialog
        open={!!detailItem}
        onOpenChange={(o) => !o && setDetailItem(null)}
        transaction={detailItem}
      />
    </AppLayout>
  );
}
