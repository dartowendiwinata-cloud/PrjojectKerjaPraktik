import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const formatRp = (n) => new Intl.NumberFormat("id-ID").format(n);

export default function TransactionDetailDialog({ open, onOpenChange, transaction }) {
  if (!transaction) return null;
  const rows = [
    ["ID Transaksi", transaction.id],
    ["Tanggal", transaction.tanggal],
    ["Kategori", transaction.kategori],
    ["Keterangan", transaction.keterangan],
    ["Total", `Rp ${formatRp(transaction.total)}`],
    ["Dibuat pada", transaction.created_at ? new Date(transaction.created_at).toLocaleString("id-ID") : "-"],
    ["Diubah pada", transaction.updated_at ? new Date(transaction.updated_at).toLocaleString("id-ID") : "-"],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-xl" data-testid="transaction-detail-dialog">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-950">Detail Transaksi</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Informasi lengkap transaksi {transaction.id}.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/40">
          {rows.map(([label, val]) => (
            <div key={label} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-3">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="text-sm font-semibold text-slate-900 sm:col-span-2 break-words">{val}</p>
            </div>
          ))}
        </div>
        <DialogFooter className="mt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            data-testid="transaction-detail-close"
            className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Tutup
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
