"""Backend API tests for Abah Orchid Dashboard."""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://kp-project-site.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


# ---- Fixtures ----
@pytest.fixture(scope="session")
def owner_token():
    r = requests.post(f"{API}/auth/login", json={"identity": "owner", "password": "password"}, timeout=20)
    assert r.status_code == 200, f"Owner login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"identity": "admin", "password": "password"}, timeout=20)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


def auth_h(token):
    return {"Authorization": f"Bearer {token}"}


# ---- Auth ----
class TestAuth:
    def test_login_owner_short_identity(self):
        r = requests.post(f"{API}/auth/login", json={"identity": "owner", "password": "password"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and len(data["token"]) > 20
        assert data["user"]["role"] == "owner"
        assert data["user"]["email"] == "owner@company.com"

    def test_login_admin_email(self):
        r = requests.post(f"{API}/auth/login", json={"identity": "admin@company.com", "password": "password"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"identity": "owner", "password": "WRONG"}, timeout=15)
        assert r.status_code == 401

    def test_me_owner(self, owner_token):
        r = requests.get(f"{API}/auth/me", headers=auth_h(owner_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["role"] == "owner"

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code in (401, 403)


# ---- Role Guards ----
class TestRoleGuards:
    def test_admin_cannot_access_dashboard(self, admin_token):
        r = requests.get(f"{API}/dashboard/stats", headers=auth_h(admin_token), timeout=15)
        assert r.status_code == 403

    def test_owner_cannot_create_transaction(self, owner_token):
        r = requests.post(f"{API}/transactions",
                          json={"tanggal": "2026-01-15", "keterangan": "x", "total": 100, "kategori": "Vanda"},
                          headers=auth_h(owner_token), timeout=15)
        assert r.status_code == 403


# ---- Transactions CRUD ----
class TestTransactionsCRUD:
    created_id = None

    def test_list_seeded(self, admin_token):
        r = requests.get(f"{API}/transactions", headers=auth_h(admin_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 60
        # ID format
        for tx in data[:5]:
            assert re.match(r"^TRX-\d{4}$", tx["id"])

    def test_create_update_get_delete(self, admin_token):
        # CREATE
        payload = {"tanggal": "2026-01-10", "keterangan": "TEST_Anggrek Bulan x2", "total": 700000, "kategori": "Anggrek Bulan"}
        r = requests.post(f"{API}/transactions", json=payload, headers=auth_h(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert re.match(r"^TRX-\d{4}$", d["id"])
        assert d["keterangan"] == payload["keterangan"]
        assert d["total"] == 700000
        new_id = d["id"]

        # VERIFY in list (search)
        r = requests.get(f"{API}/transactions?search=TEST_Anggrek", headers=auth_h(admin_token), timeout=15)
        assert r.status_code == 200
        ids = [t["id"] for t in r.json()]
        assert new_id in ids

        # UPDATE
        upd = {**payload, "keterangan": "TEST_Anggrek Bulan x3", "total": 1050000}
        r = requests.put(f"{API}/transactions/{new_id}", json=upd, headers=auth_h(admin_token), timeout=15)
        assert r.status_code == 200
        # confirm
        r = requests.get(f"{API}/transactions?search={new_id}", headers=auth_h(admin_token), timeout=15)
        found = [t for t in r.json() if t["id"] == new_id][0]
        assert found["total"] == 1050000
        assert found["keterangan"] == "TEST_Anggrek Bulan x3"

        # DELETE
        r = requests.delete(f"{API}/transactions/{new_id}", headers=auth_h(admin_token), timeout=15)
        assert r.status_code == 200
        # verify gone
        r = requests.get(f"{API}/transactions?search={new_id}", headers=auth_h(admin_token), timeout=15)
        assert all(t["id"] != new_id for t in r.json())

    def test_delete_not_found(self, admin_token):
        r = requests.delete(f"{API}/transactions/TRX-9999", headers=auth_h(admin_token), timeout=15)
        assert r.status_code == 404


# ---- Stocks ----
class TestStocksCRUD:
    def test_list_seeded(self, admin_token):
        r = requests.get(f"{API}/stocks", headers=auth_h(admin_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 4
        assert all(re.match(r"^BRG-\d{4}$", s["id"]) for s in data)

    def test_create_update_delete(self, admin_token):
        payload = {"nama_barang": "TEST_Item", "jumlah_stok": 25, "satuan": "Pcs"}
        r = requests.post(f"{API}/stocks", json=payload, headers=auth_h(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert re.match(r"^BRG-\d{4}$", d["id"])
        sid = d["id"]

        r = requests.put(f"{API}/stocks/{sid}", json={**payload, "jumlah_stok": 60}, headers=auth_h(admin_token), timeout=15)
        assert r.status_code == 200

        # verify
        r = requests.get(f"{API}/stocks?search=TEST_Item", headers=auth_h(admin_token), timeout=15)
        item = [s for s in r.json() if s["id"] == sid][0]
        assert item["jumlah_stok"] == 60

        r = requests.delete(f"{API}/stocks/{sid}", headers=auth_h(admin_token), timeout=15)
        assert r.status_code == 200


# ---- Sync Settings ----
class TestSyncSettings:
    def test_get(self, admin_token):
        r = requests.get(f"{API}/sync-settings", headers=auth_h(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "frekuensi" in d and "waktu_eksekusi" in d

    def test_save_and_run(self, admin_token):
        r = requests.put(f"{API}/sync-settings", json={"frekuensi": "Setiap Jam", "waktu_eksekusi": "02:30"},
                         headers=auth_h(admin_token), timeout=15)
        assert r.status_code == 200
        r = requests.get(f"{API}/sync-settings", headers=auth_h(admin_token), timeout=15)
        d = r.json()
        assert d["frekuensi"] == "Setiap Jam"
        assert d["waktu_eksekusi"] == "02:30"

        r = requests.post(f"{API}/sync-settings/run", headers=auth_h(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["terakhir_sinkronisasi"] is not None


# ---- Dashboard ----
class TestDashboard:
    @pytest.mark.parametrize("period", ["current_month", "current_quarter", "current_year", "previous_year"])
    def test_stats_periods(self, owner_token, period):
        r = requests.get(f"{API}/dashboard/stats?period={period}", headers=auth_h(owner_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) == 4
        labels = [c["label"] for c in data]
        assert labels == ["Total Pendapatan", "Total Transaksi", "Barang Terjual", "Rata-rata Order"]
        for c in data:
            assert "value" in c and "change" in c and "positive" in c

    def test_chart_year(self, owner_token):
        r = requests.get(f"{API}/dashboard/chart?period=current_year", headers=auth_h(owner_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "trend" in d and "categories" in d
        assert len(d["trend"]["labels"]) == len(d["trend"]["actual"]) == len(d["trend"]["forecast"])
        assert len(d["categories"]["labels"]) == len(d["categories"]["values"])
