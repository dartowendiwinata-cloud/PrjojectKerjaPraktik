from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta, date

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT config
JWT_SECRET = os.environ.get('JWT_SECRET', 'abah-orchid-secret-key-change-me')
JWT_ALG = 'HS256'
JWT_EXP_HOURS = 24

app = FastAPI(title="Abah Orchid Dashboard API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ---------- helpers ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_role(role: str):
    async def checker(user: dict = Depends(get_current_user)):
        if user.get("role") != role:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return checker

# ---------- Stock helpers ----------
def parse_keterangan(keterangan: str) -> tuple[str, int]:
    """Parse 'Nama Barang xN' → (nama_barang, qty). Falls back to (keterangan, 1)."""
    m = re.match(r'^(.+) x(\d+)$', keterangan.strip())
    if m:
        return m.group(1).strip(), int(m.group(2))
    return keterangan.strip(), 1

async def deduct_stock(nama_barang: str, qty: int) -> None:
    """
    Kurangi stok barang yang cocok (case-insensitive).
    Raise HTTP 400 jika stok tidak mencukupi.
    Diam-diam lewati jika barang tidak ada di inventaris.
    """
    stock = await db.stocks.find_one(
        {"nama_barang": {"$regex": f"^{re.escape(nama_barang)}$", "$options": "i"}},
        {"_id": 0}
    )
    if not stock:
        # Barang tidak terdaftar di inventaris — skip
        return

    new_qty = stock["jumlah_stok"] - qty
    if new_qty < 0:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Stok tidak mencukupi untuk '{stock['nama_barang']}'. "
                f"Tersedia: {stock['jumlah_stok']}, dibutuhkan: {qty}."
            )
        )
    await db.stocks.update_one(
        {"id": stock["id"]},
        {"$set": {"jumlah_stok": new_qty}}
    )

async def restore_stock(nama_barang: str, qty: int) -> None:
    """
    Kembalikan stok saat transaksi dihapus atau diedit.
    Diam-diam lewati jika barang tidak ada di inventaris.
    """
    await db.stocks.update_one(
        {"nama_barang": {"$regex": f"^{re.escape(nama_barang)}$", "$options": "i"}},
        {"$inc": {"jumlah_stok": qty}}
    )

# ---------- Models ----------
class LoginRequest(BaseModel):
    identity: str
    password: str

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str

class TransactionBase(BaseModel):
    tanggal: str  # YYYY-MM-DD
    keterangan: str
    total: int
    kategori: str

class TransactionOut(TransactionBase):
    id: str

class StockBase(BaseModel):
    nama_barang: str
    jumlah_stok: int
    satuan: str

class StockOut(StockBase):
    id: str

class SyncSettingIn(BaseModel):
    frekuensi: str
    waktu_eksekusi: str  # HH:MM

# ---------- ID Generators ----------
async def next_id(collection: str, prefix: str, pad: int) -> str:
    last = await db[collection].find_one(sort=[("id", -1)], projection={"_id": 0, "id": 1})
    if last and last.get("id"):
        try:
            num = int(last["id"].split("-")[1]) + 1
        except Exception:
            num = 1
    else:
        num = 1
    return f"{prefix}-{str(num).zfill(pad)}"

# ---------- Auth Endpoints ----------
@api_router.post("/auth/login")
async def login(payload: LoginRequest):
    identity = payload.identity.strip()
    if "@" in identity:
        email = identity
    else:
        email = {
            "admin": "admin@company.com",
            "owner": "owner@company.com",
        }.get(identity.lower(), identity)

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=401, detail="Username atau password tidak cocok.")
    token = create_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]},
    }

@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(**user)

# ---------- Transactions (Admin) ----------
@api_router.get("/transactions")
async def list_transactions(search: str = "", user: dict = Depends(get_current_user)):
    query = {}
    if search:
        query = {"$or": [
            {"id": {"$regex": search, "$options": "i"}},
            {"keterangan": {"$regex": search, "$options": "i"}},
            {"kategori": {"$regex": search, "$options": "i"}},
        ]}
    docs = await db.transactions.find(query, {"_id": 0}).sort("tanggal", -1).to_list(2000)
    return docs

@api_router.post("/transactions")
async def create_transaction(payload: TransactionBase, user: dict = Depends(require_role("admin"))):
    nama_barang, qty = parse_keterangan(payload.keterangan)

    # Kurangi stok — raise 400 jika tidak mencukupi
    await deduct_stock(nama_barang, qty)

    new_id = await next_id("transactions", "TRX", 4)
    doc = {
        "id": new_id,
        **payload.model_dump(),
        "created_at": now_utc().isoformat(),
        "updated_at": now_utc().isoformat(),
    }
    await db.transactions.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/transactions/{trx_id}")
async def update_transaction(trx_id: str, payload: TransactionBase, user: dict = Depends(require_role("admin"))):
    existing = await db.transactions.find_one({"id": trx_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")

    old_nama, old_qty = parse_keterangan(existing["keterangan"])
    new_nama, new_qty = parse_keterangan(payload.keterangan)

    # Kembalikan stok lama dulu, lalu kurangi stok baru
    await restore_stock(old_nama, old_qty)
    try:
        await deduct_stock(new_nama, new_qty)
    except HTTPException:
        # Batalkan restore jika deduction gagal
        await deduct_stock(old_nama, old_qty)
        raise

    await db.transactions.update_one(
        {"id": trx_id},
        {"$set": {**payload.model_dump(), "updated_at": now_utc().isoformat()}}
    )
    return {"status": "ok"}

@api_router.delete("/transactions/{trx_id}")
async def delete_transaction(trx_id: str, user: dict = Depends(require_role("admin"))):
    existing = await db.transactions.find_one({"id": trx_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")

    # Kembalikan stok sebelum hapus
    nama_barang, qty = parse_keterangan(existing["keterangan"])
    await restore_stock(nama_barang, qty)

    await db.transactions.delete_one({"id": trx_id})
    return {"status": "ok"}

# ---------- Stocks (Admin) ----------
@api_router.get("/stocks")
async def list_stocks(search: str = "", user: dict = Depends(get_current_user)):
    query = {}
    if search:
        query = {"$or": [
            {"id": {"$regex": search, "$options": "i"}},
            {"nama_barang": {"$regex": search, "$options": "i"}},
            {"satuan": {"$regex": search, "$options": "i"}},
        ]}
    docs = await db.stocks.find(query, {"_id": 0}).sort("id", 1).to_list(2000)
    return docs

@api_router.post("/stocks")
async def create_stock(payload: StockBase, user: dict = Depends(require_role("admin"))):
    new_id = await next_id("stocks", "BRG", 4)
    doc = {"id": new_id, **payload.model_dump(), "created_at": now_utc().isoformat()}
    await db.stocks.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/stocks/{sid}")
async def update_stock(sid: str, payload: StockBase, user: dict = Depends(require_role("admin"))):
    res = await db.stocks.update_one({"id": sid}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"status": "ok"}

@api_router.delete("/stocks/{sid}")
async def delete_stock(sid: str, user: dict = Depends(require_role("admin"))):
    res = await db.stocks.delete_one({"id": sid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"status": "ok"}

# ---------- Sync Settings (Admin) ----------
@api_router.get("/sync-settings")
async def get_sync_setting(user: dict = Depends(get_current_user)):
    doc = await db.sync_settings.find_one({"id": "default"}, {"_id": 0})
    if not doc:
        doc = {
            "id": "default",
            "frekuensi": "Setiap Hari",
            "waktu_eksekusi": "00:00",
            "terakhir_sinkronisasi": None,
        }
    return doc

@api_router.put("/sync-settings")
async def save_sync_setting(payload: SyncSettingIn, user: dict = Depends(require_role("admin"))):
    existing = await db.sync_settings.find_one({"id": "default"})
    update = {
        "frekuensi": payload.frekuensi,
        "waktu_eksekusi": payload.waktu_eksekusi,
    }
    await db.sync_settings.update_one(
        {"id": "default"},
        {"$set": update, "$setOnInsert": {"id": "default", "terakhir_sinkronisasi": existing.get("terakhir_sinkronisasi") if existing else None}},
        upsert=True,
    )
    return {"status": "ok"}

@api_router.post("/sync-settings/run")
async def run_sync(user: dict = Depends(require_role("admin"))):
    ts = now_utc().isoformat()
    await db.sync_settings.update_one(
        {"id": "default"},
        {"$set": {"terakhir_sinkronisasi": ts}, "$setOnInsert": {"id": "default", "frekuensi": "Setiap Hari", "waktu_eksekusi": "00:00"}},
        upsert=True,
    )
    return {"status": "ok", "terakhir_sinkronisasi": ts}

# ---------- Product Catalog ----------
PRODUCT_CATALOG = {
    "Anggrek Bulan": [
        {"nama": "Anggrek Bulan Putih Premium", "harga": 52000},
        {"nama": "Anggrek Bulan Ungu", "harga": 37000},
        {"nama": "Anggrek Bulan Mini Koleksi", "harga": 20500},
        {"nama": "Anggrek Bulan Black Jack", "harga": 44500},
        {"nama": "Anggrek Bulan Kuning", "harga": 32000},
    ],
    "Dendrobium": [
        {"nama": "Bibit Dendrobium", "harga": 10000},
        {"nama": "Dendrobium Ungu Berbunga", "harga": 45000},
    ],
    "Cattleya": [
        {"nama": "Cattleya Kuning Eksklusif", "harga": 12000},
        {"nama": "Cattleya Sunset", "harga": 15000},
        {"nama": "Cattleya Remaja ", "harga": 55000},
        {"nama": "Cattleya kuning Lidah Ungu", "harga": 63000},
    ],
    "Anggrek Harimau": [
        {"nama": "Anggrek Macan Hitam", "harga": 45000},
        {"nama": "Anggrek Telapak Kaki Harimau", "harga": 28000},
    ],
    "Anggrek Kupu-Kupu": [
        {"nama": "Kupu-Kupu sejati", "harga": 41000},
        {"nama": "Kupu-kupu Mini", "harga": 18000},
        {"nama": "Kupu-kupu Eksotis", "harga": 80000},
    ],
    "Sarana Budidaya": [
        {"nama": "Pupuk Vitamin B1 Orchid", "harga": 10800},
        {"nama": "Pot Plastik", "harga": 18000},
        {"nama": "Pot Tanah Liat", "harga": 23000},
        {"nama": "Media Tanam Pakis", "harga": 19000},
        {"nama": "Paket Nutrisi Anggrek Lengkap", "harga": 15000},
        {"nama": "Fungisida", "harga": 30200},
        {"nama": "Moss Putih", "harga": 28000},
        {"nama": "Arang Kayu", "harga": 8000},
        {"nama": "Hand Sprayer", "harga": 27000},
    ],
}

@api_router.get("/products")
async def list_products(user: dict = Depends(get_current_user)):
    return PRODUCT_CATALOG

# ---------- Dashboard (Owner) ----------
PRICE_REF = {
    "Anggrek Bulan": 300000,
    "Dendrobium": 220000,
    "Cattleya": 290000,
    "Vanda": 330000,
    "Sarana Budidaya": 80000,
}

def period_range(period: str):
    today = datetime.now(timezone.utc).date()
    if period == "current_month":
        start = today.replace(day=1)
        if today.month == 12:
            end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    elif period == "current_quarter":
        q = (today.month - 1) // 3
        start_month = q * 3 + 1
        start = today.replace(month=start_month, day=1)
        end_month = start_month + 2
        if end_month == 12:
            end = date(today.year, 12, 31)
        else:
            end = date(today.year, end_month + 1, 1) - timedelta(days=1)
    elif period == "previous_year":
        start = date(today.year - 1, 1, 1)
        end = date(today.year - 1, 12, 31)
    else:  # current_year
        start = date(today.year, 1, 1)
        end = date(today.year, 12, 31)
    return start, end

def previous_period_range(period: str):
    """Return the previous-period window matched to the current period for fair change% comparison."""
    today = datetime.now(timezone.utc).date()
    if period == "current_month":
        first_this = today.replace(day=1)
        last_prev = first_this - timedelta(days=1)
        start = last_prev.replace(day=1)
        end = last_prev
    elif period == "current_quarter":
        q = (today.month - 1) // 3
        if q == 0:
            start = date(today.year - 1, 10, 1)
            end = date(today.year - 1, 12, 31)
        else:
            sm = (q - 1) * 3 + 1
            em = sm + 2
            start = date(today.year, sm, 1)
            if em == 12:
                end = date(today.year, 12, 31)
            else:
                end = date(today.year, em + 1, 1) - timedelta(days=1)
    elif period == "previous_year":
        start = date(today.year - 2, 1, 1)
        end = date(today.year - 2, 12, 31)
    else:  # current_year -> previous calendar year
        start = date(today.year - 1, 1, 1)
        end = date(today.year - 1, 12, 31)
    return start, end

def percentage_change(current: int, previous: int):
    """Return (label, positive) tuple. Returns ('—', True) when previous has no data."""
    if previous <= 0:
        return "—", current >= 0
    pct = ((current - previous) / previous) * 100
    sign_positive = pct >= 0
    return f"{abs(pct):.1f}".replace(".", ",") + "%", sign_positive

INDO_MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"]

@api_router.get("/dashboard/stats")
async def dashboard_stats(period: str = "current_year", user: dict = Depends(require_role("owner"))):
    start, end = period_range(period)
    start_s, end_s = start.isoformat(), end.isoformat()

    txs = await db.transactions.find(
        {"tanggal": {"$gte": start_s, "$lte": end_s}},
        {"_id": 0}
    ).to_list(5000)

    total_revenue = sum(int(t["total"]) for t in txs)
    total_tx = len(txs)
    items_sold = sum(max(1, round(int(t["total"]) / PRICE_REF.get(t["kategori"], 150000))) for t in txs)
    avg_order = round(total_revenue / total_tx) if total_tx > 0 else 0

    prev_start, prev_end = previous_period_range(period)
    prev_w = await db.transactions.find(
        {"tanggal": {"$gte": prev_start.isoformat(), "$lte": prev_end.isoformat()}}, {"_id": 0}
    ).to_list(5000)
    prev_rev = sum(int(t["total"]) for t in prev_w)
    prev_tx = len(prev_w)
    prev_items = sum(max(1, round(int(t["total"]) / PRICE_REF.get(t["kategori"], 150000))) for t in prev_w)
    prev_avg = round(prev_rev / prev_tx) if prev_tx > 0 else 0

    period_labels = {
        "current_month": "bulan lalu",
        "current_quarter": "kuartal lalu",
        "current_year": "tahun lalu",
        "previous_year": "2 tahun lalu",
    }
    compare_label = period_labels.get(period, "periode lalu")

    rev_change, rev_pos = percentage_change(total_revenue, prev_rev)
    tx_change, tx_pos = percentage_change(total_tx, prev_tx)
    items_change, items_pos = percentage_change(items_sold, prev_items)
    avg_change, avg_pos = percentage_change(avg_order, prev_avg)

    return [
        {"label": "Total Pendapatan", "value": f"Rp {total_revenue:,.0f}".replace(",", "."),
         "change": rev_change, "positive": rev_pos, "icon": "currency", "compare_label": compare_label},
        {"label": "Total Transaksi", "value": f"{total_tx:,}".replace(",", "."),
         "change": tx_change, "positive": tx_pos, "icon": "pulse", "compare_label": compare_label},
        {"label": "Barang Terjual", "value": f"{items_sold:,}".replace(",", "."),
         "change": items_change, "positive": items_pos, "icon": "box", "compare_label": compare_label},
        {"label": "Rata-rata Order", "value": f"Rp {avg_order:,.0f}".replace(",", "."),
         "change": avg_change, "positive": avg_pos, "icon": "users", "compare_label": compare_label},
    ]

@api_router.get("/dashboard/chart")
async def dashboard_chart(period: str = "current_year", user: dict = Depends(require_role("owner"))):
    start, end = period_range(period)
    start_s, end_s = start.isoformat(), end.isoformat()

    txs = await db.transactions.find(
        {"tanggal": {"$gte": start_s, "$lte": end_s}}, {"_id": 0}
    ).to_list(5000)

    months = []
    cursor = date(start.year, start.month, 1)
    end_cursor = date(end.year, end.month, 1)
    while cursor <= end_cursor:
        months.append((cursor.year, cursor.month))
        if cursor.month == 12:
            cursor = date(cursor.year + 1, 1, 1)
        else:
            cursor = date(cursor.year, cursor.month + 1, 1)

    monthly_totals = {f"{y}-{m:02d}": 0 for (y, m) in months}
    for t in txs:
        key = t["tanggal"][:7]
        if key in monthly_totals:
            monthly_totals[key] += int(t["total"])

    labels = [f"{INDO_MONTHS[m-1]} {y}" for (y, m) in months]
    actual = [monthly_totals[f"{y}-{m:02d}"] for (y, m) in months]

    # Kunci bulan berjalan, format "YYYY-MM"
    today = datetime.now(timezone.utc).date()
    current_month_key = f"{today.year}-{today.month:02d}"

    forecast = []
    for i, v in enumerate(actual):
        month_key = f"{months[i][0]}-{months[i][1]:02d}"
        is_future = month_key > current_month_key  # bulan yang belum dilalui

        if i < 2:
            # 2 bulan pertama: pakai nilai aktual apa adanya sebagai basis
            forecast.append(v)
        elif is_future:
            # Bulan masa depan: actual = 0 (belum ada data),
            # pakai rata-rata 2 nilai forecast sebelumnya agar kurva mulus
            forecast.append(round((forecast[i - 1] + forecast[i - 2]) / 2))
        else:
            # Bulan yang sudah lewat: moving average 3 bulan normal
            forecast.append(round((actual[i - 2] + actual[i - 1] + v) / 3))

    cat_totals = {}
    for t in txs:
        cat_totals[t["kategori"]] = cat_totals.get(t["kategori"], 0) + int(t["total"])
    cat_sorted = sorted(cat_totals.items(), key=lambda x: -x[1])

    return {
        "trend": {"labels": labels, "actual": actual, "forecast": forecast},
        "categories": {
            "labels": [c[0] for c in cat_sorted],
            "values": [c[1] for c in cat_sorted],
        }
    }

# ---------- Seeder ----------
async def seed_data():
    users_count = await db.users.count_documents({})
    if users_count == 0:
        await db.users.insert_many([
            {"id": "USR-001", "name": "Owner User", "email": "owner@company.com",
             "role": "owner", "password": hash_password("password")},
            {"id": "USR-002", "name": "Admin User", "email": "admin@company.com",
             "role": "admin", "password": hash_password("password")},
        ])
        logging.info("Seeded users")

    tx_count = await db.transactions.count_documents({})
    if tx_count == 0:
        templates = {
            "Anggrek Bulan": [("Anggrek Bulan Putih Dewasa", 350000), ("Anggrek Bulan Pink Premium", 425000), ("Anggrek Bulan Mini Koleksi", 220000)],
            "Dendrobium": [("Bibit Dendrobium Botolan", 180000), ("Dendrobium Ungu Berbunga", 260000), ("Paket Dendrobium Siap Display", 300000)],
            "Cattleya": [("Cattleya Kuning Eksklusif", 320000), ("Cattleya Ungu Harum", 375000), ("Cattleya Remaja Berpot", 240000)],
            "Vanda": [("Vanda Gantung Motif Biru", 410000), ("Vanda Akar Telanjang", 285000), ("Vanda Siap Koleksi", 360000)],
            "Sarana Budidaya": [("Pupuk Vitamin B1 Orchid", 75000), ("Pot Tanah Liat", 45000), ("Media Tanam Pakis Premium", 68000), ("Paket Nutrisi Anggrek Lengkap", 120000)],
        }
        categories = list(templates.keys())
        today = datetime.now(timezone.utc).date()
        if today.month <= 5:
            start = date(today.year - 1, today.month + 7, 1)
        else:
            start = date(today.year, today.month - 5, 1)
        docs = []
        for i in range(60):
            cat = categories[i % len(categories)]
            product_set = templates[cat]
            product = product_set[i % len(product_set)]
            qty = (i % 4) + 1
            d = start + timedelta(days=(i * 3) % 170)
            docs.append({
                "id": f"TRX-{i+1:04d}",
                "tanggal": d.isoformat(),
                "keterangan": f"{product[0]} x{qty}",
                "total": product[1] * qty,
                "kategori": cat,
                "created_at": now_utc().isoformat(),
                "updated_at": now_utc().isoformat(),
            })
        await db.transactions.insert_many(docs)
        logging.info("Seeded 60 transactions")

    st_count = await db.stocks.count_documents({})
    if st_count == 0:
        await db.stocks.insert_many([
            {"id": "BRG-0001", "nama_barang": "Anggrek Bulan Putih Dewasa", "jumlah_stok": 150, "satuan": "Pcs", "created_at": now_utc().isoformat()},
            {"id": "BRG-0003", "nama_barang": "Pupuk Vitamin B1 Orchid", "jumlah_stok": 800, "satuan": "Unit", "created_at": now_utc().isoformat()},
            {"id": "BRG-0004", "nama_barang": "Pot Tanah Liat", "jumlah_stok": 12, "satuan": "Lusin", "created_at": now_utc().isoformat()},
        ])
        logging.info("Seeded stocks")

    ss = await db.sync_settings.find_one({"id": "default"})
    if not ss:
        await db.sync_settings.insert_one({
            "id": "default",
            "frekuensi": "Setiap Hari",
            "waktu_eksekusi": "00:00",
            "terakhir_sinkronisasi": (now_utc() - timedelta(hours=4)).isoformat(),
        })

@api_router.get("/")
async def root():
    return {"app": "Abah Orchid Dashboard API", "version": "1.0"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    await seed_data()
    logger.info("Abah Orchid API started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()