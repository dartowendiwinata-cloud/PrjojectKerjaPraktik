# Abah Orchid - Sistem Dashboard Visualisasi Penjualan

Aplikasi web untuk Kerja Praktik. Sistem dashboard penjualan untuk toko anggrek **Abah Orchid (since 2001)** dengan 2 role:
- **Pemilik (Owner)**: Dashboard visualisasi (KPI, tren, forecasting, breakdown kategori), ekspor laporan PDF/JPG/CSV
- **Admin**: Kelola data transaksi (CRUD + form produk dengan auto-total), kelola stok, jadwal sinkronisasi data

## Stack Teknologi

- **Backend**: FastAPI (Python 3.11+), Motor (MongoDB async driver), PyJWT, bcrypt
- **Frontend**: React 19 (CRA + craco), React Router, Recharts, Tailwind CSS, shadcn/ui, Sonner (toast), jsPDF + html2canvas (export)
- **Database**: MongoDB

## Struktur Proyek

```
/app
├── backend/
│   ├── server.py              # FastAPI app + semua endpoint + seeder
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # MONGO_URL, DB_NAME, JWT_SECRET
│   └── tests/
│       └── test_abah_orchid_api.py
├── frontend/
│   ├── src/
│   │   ├── App.js, App.css, index.js, index.css
│   │   ├── contexts/AuthContext.jsx
│   │   ├── components/
│   │   │   ├── AppLayout.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── ConfirmDialog.jsx
│   │   │   ├── TransactionDetailDialog.jsx
│   │   │   └── ui/            # shadcn components
│   │   └── pages/
│   │       ├── LoginPage.jsx
│   │       ├── OwnerDashboardPage.jsx
│   │       ├── TransactionsPage.jsx
│   │       ├── StocksPage.jsx
│   │       └── SyncSettingsPage.jsx
│   ├── public/LogoAbahOrchid.png
│   ├── package.json
│   └── .env                   # REACT_APP_BACKEND_URL
└── memory/PRD.md              # Dokumentasi requirement & log perubahan
```

## Setup Lokal

### 1. Prasyarat
- Python 3.11+
- Node.js 18+ dengan **Yarn** (jangan pakai npm)
- MongoDB lokal jalan di `mongodb://localhost:27017` (atau ubah `MONGO_URL` di `backend/.env`)

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
# Edit backend/.env jika perlu (default sudah set untuk lokal)
uvicorn server:app --reload --port 8001
```

Saat startup pertama, backend otomatis seed data: 2 user (owner & admin), 60 transaksi, 4 stok, dan 1 sync setting.

### 3. Frontend

```bash
cd frontend
yarn install
yarn start
```

Frontend akan terbuka di `http://localhost:3000` dan otomatis proxy ke backend lewat `REACT_APP_BACKEND_URL`.

## Akun Demo (auto-seeded)

| Role  | Username/Email      | Password   | Redirect                |
|-------|---------------------|------------|-------------------------|
| Owner | `owner` atau `owner@company.com` | `password` | `/owner/dashboard`      |
| Admin | `admin` atau `admin@company.com` | `password` | `/admin/transactions`   |

## Fitur Utama

### Pemilik (Owner)
- **4 KPI Cards**: Total Pendapatan, Total Transaksi, Barang Terjual, Rata-rata Order dengan change% adaptif vs periode lalu (bulan/kuartal/tahun)
- **Tren Penjualan & Forecasting** (Recharts ComposedChart) + tabel drill-down
- **Penjualan per Kategori** (horizontal bar chart)
- **Period filter**: Bulan Ini / Kuartal Ini / Tahun Ini / Tahun Lalu
- **Ekspor Laporan**: PDF, JPG, CSV

### Admin
- **Kelola Transaksi**: Form dengan dropdown produk (5 kategori × 3-4 produk dengan harga satuan) → **Total auto-calculate** dari Harga × Qty. Pagination 10/halaman + Detail modal + AlertDialog konfirmasi delete
- **Kelola Stok**: CRUD dengan badge merah untuk stok rendah (≤50)
- **Jadwal Refresh Data**: Atur frekuensi & waktu sinkronisasi otomatis + tombol Manual Sync

## Endpoint API Utama

Semua endpoint diawali `/api`. Otentikasi: `Authorization: Bearer <JWT>`.

| Method | Endpoint                          | Role        | Keterangan                |
|--------|-----------------------------------|-------------|---------------------------|
| POST   | `/auth/login`                     | -           | Login                     |
| GET    | `/auth/me`                        | any         | Current user info         |
| GET    | `/dashboard/stats?period=...`     | owner       | KPI cards                 |
| GET    | `/dashboard/chart?period=...`     | owner       | Trend + category data     |
| GET    | `/transactions`                   | any         | List transaksi            |
| POST/PUT/DELETE | `/transactions[/id]`     | admin       | CRUD transaksi            |
| GET    | `/products`                       | any         | Product catalog           |
| GET    | `/stocks`                         | any         | List stok                 |
| POST/PUT/DELETE | `/stocks[/id]`           | admin       | CRUD stok                 |
| GET/PUT | `/sync-settings`                 | any/admin   | Pengaturan sinkronisasi   |
| POST   | `/sync-settings/run`              | admin       | Trigger manual sync       |

## Testing

```bash
cd backend
python -m pytest tests/ -v
```

19/19 tests pass per terakhir update.

## Logo

Logo Abah Orchid disertakan di `frontend/public/LogoAbahOrchid.png`. Dipakai di login page dan sidebar.
