# PRD - Abah Orchid Sistem Dashboard Visualisasi Penjualan

## Original Problem Statement
Recreate KP (internship) project "Abah Orchid Sistem Dashboard Visualisasi Penjualan" web app exactly per provided design (perancangan.pdf) and report (Laporan Lengkap Kelompok 8.pdf). User provided original Laravel/Livewire app source code (Web_KP.zip) and logo (LogoAbahOrchid.png). Must match UML, database schema, layout, colors, and UI/UX exactly.

## Stack
- Frontend: React 19 (CRA + craco), React Router, Recharts, jsPDF, html2canvas, Tailwind
- Backend: FastAPI + Motor (MongoDB async), JWT (PyJWT) + bcrypt
- Database: MongoDB

## User Personas
- **Owner (Pemilik)**: Strategic decision maker. Views dashboard with KPI, sales trend + forecasting, category breakdown, exports to PDF/JPG/CSV
- **Admin**: Operational user. Manages transaction data, data sources, stock inventory, and refresh schedule

## Core Requirements
1. Login page with role-based redirect
2. Owner Dashboard: 4 KPI cards, sales trend + forecast line chart, category bar chart, period filter, export (PDF/JPG/CSV), drill down table
3. Admin CRUD: Transactions, Stocks, Data Sources
4. Admin Sync Settings: schedule + manual run
5. Role-based route guards
6. Sidebar theming by role (slate-900 owner / red-950 admin)
7. Auto-seed dummy data on startup (60 tx, 4 stocks, 3 data sources)

## Implemented (2026-06-14)
- ✅ Auth: JWT-based login with username shortcut (admin/owner) or email
- ✅ Owner Dashboard with recharts (KPI, ComposedChart trend, BarChart categories)
- ✅ Period filter (current_month/quarter/year, previous_year) - server-side aggregation
- ✅ Drill down table for trend chart
- ✅ Export dropdown: PDF (jsPDF+html2canvas), JPG, CSV
- ✅ Admin CRUD pages for Transactions/Stocks/Data Sources with search
- ✅ Sync Settings + Manual Sync Run
- ✅ Role guards (frontend ProtectedRoute + backend require_role)
- ✅ Sidebar with role-based theming
- ✅ Auto-seeder on startup (idempotent)
- ✅ Logo placed at /app/frontend/public/LogoAbahOrchid.png
- ✅ [2026-06-14] Pagination (10/page) + Detail view modal for Transactions
- ✅ [2026-06-14] Shadcn AlertDialog for delete confirmation (Transactions/Stocks/DataSources)
- ✅ [2026-06-14] Adaptive previous-period window: current_month vs bulan lalu, current_quarter vs kuartal lalu, current_year vs tahun lalu, previous_year vs 2 tahun lalu. Display "—" when previous period has no data instead of misleading huge %.
- ✅ [2026-06-14] Toast notifications (sonner) menggantikan banner inline success di Transactions/Stocks/SyncSettings. Toaster di-mount di App.js, posisi top-right, richColors enabled.
- ✅ [2026-06-14] **Sumber Data dihapus** (frontend route+page+sidebar, backend endpoints + seeder + tests). 19/19 tests pass.
- ✅ [2026-06-14] **Form Transaksi** redesign: pilih Kategori → Nama Barang (dengan harga satuan) → Quantity → Total auto-calculate. Backend `/api/products` mengembalikan product catalog.
- ✅ [2026-06-14] **Dashboard Owner**: Chart Penjualan per Kategori dirapikan — multi-color per kategori, label horizontal lengkap (tidak terpotong), value label "Rp X.XM" di ujung bar, height 380px, card alignment items-stretch.

## Test Credentials
- Owner: owner@company.com / password (also accepts "owner" as identity)
- Admin: admin@company.com / password (also accepts "admin" as identity)

## Backlog / Next Action Items (P1)
- Replace window.confirm with shadcn AlertDialog for delete confirmation
- Match previous-period window length to selected period for accurate change%
- Set min-height on Recharts ResponsiveContainer to suppress width/height(-1) warnings
- Add toast notifications (sonner) instead of inline status messages
- Add pagination for transactions table when items grow

## Backlog (P2)
- Refactor server.py into multiple routers
- Migrate next_id to numeric counter collection (for IDs beyond 9999)
- Add Forgot Password flow
- Add detail view per transaction
- Add user management for owner role
