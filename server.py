import json
import os
import re
import sqlite3
import hashlib
import hmac
import base64
import secrets
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from socketserver import ThreadingMixIn
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
IMAGES_DIR = BASE_DIR / "images"
ASSETS_DIR = BASE_DIR / "assets"
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "fixlens.db"

WHATSAPP = "573204658078"
BRAND = "FixLens"
ADMIN_DEFAULT_USER = "admin"
ADMIN_DEFAULT_PASS = "fixlens123"
SESSION_SECRET = secrets.token_hex(24)
sessions = {}


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200000)
    return salt + "$" + base64.b64encode(digest).decode()


def verify_password(password, stored):
    try:
        salt, b64 = stored.split("$", 1)
    except Exception:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200000)
    return hmac.compare_digest(base64.b64encode(digest).decode(), b64)


def init_db():
    DATA_DIR.mkdir(exist_ok=True)
    conn = get_db()
    c = conn.cursor()
    c.executescript(
        """
        CREATE TABLE IF NOT EXISTS products(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            brand TEXT,
            category TEXT,
            gender TEXT,
            image TEXT,
            description TEXT,
            features TEXT,
            tags TEXT,
            sort_order INTEGER DEFAULT 0,
            active INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS reviews(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            rating INTEGER DEFAULT 5,
            comment TEXT,
            date TEXT,
            approved INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS orders(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reference TEXT,
            product_name TEXT,
            customer_name TEXT,
            customer_phone TEXT,
            customer_email TEXT,
            customer_address TEXT,
            amount_cents INTEGER,
            currency TEXT DEFAULT 'COP',
            status TEXT DEFAULT 'pendiente',
            channel TEXT DEFAULT 'whatsapp',
            created TEXT
        );
        CREATE TABLE IF NOT EXISTS admins(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings(
            key TEXT PRIMARY KEY,
            value TEXT
        );
        """
    )

    if c.execute("SELECT COUNT(*) FROM admins").fetchone()[0] == 0:
        c.execute(
            "INSERT INTO admins(username, password_hash) VALUES(?,?)",
            (ADMIN_DEFAULT_USER, hash_password(ADMIN_DEFAULT_PASS)),
        )
    if c.execute("SELECT COUNT(*) FROM products").fetchone()[0] == 0:
        seed_products(c)
    if c.execute("SELECT COUNT(*) FROM settings").fetchone()[0] == 0:
        default_settings = {
            "wompi_public_key": "",
            "wompi_private_key": "",
            "wompi_integrity_key": "",
            "wompi_env": "test",
            "store_whatsapp": WHATSAPP,
            "store_address": "Cra 7 # 18-42 Local 236-1, Centro Comercial Monserrate, Localidad Santa Fe, Bogotá",
            "store_hours": "Lunes a Sábado: 9:00 am - 8:00 pm · Domingo: 10:00 am - 6:00 pm",
        }
        for k, v in default_settings.items():
            c.execute("INSERT INTO settings(key, value) VALUES(?,?)", (k, v))
    conn.commit()
    conn.close()


def seed_products(c):
    products = [
        ("Armazón Tommy Hilfiger BRU", "Tommy Hilfiger", "Montura", "Unisex",
         "IMG-20260906-WA0002.jpg",
         "Montura rectangular de acetato premium en azul marino con patillas rojas emblemáticas de la casa. Diseño icónico blue & red con herrajes metálicos dorados. Incluye estuche rígido original.",
         "Color: Azul marino con acentos rojos|Material: Acetato premium|Forma: Rectangular|Estilo: Unisex / Hombre|Incluye: Estuche rígido original|Patillas: Rojo con logo textil",
         "montura,acetato,tommy,unisex", 1),
        ("Armazón Emporio Armani C1", "Emporio Armani", "Montura", "Unisex",
         "IMG-20260906-WA0003.jpg",
         "Montura negra de líneas rectas y sobrias, con el mítico águila grabada en la patilla. Acabados mates elegantes. Incluye caja negra rígida y tarjeta de autenticidad.",
         "Color: Negro mate|Material: Acetato|Forma: Rectangular clásica|Logo: Águila Armani grabada|Incluye: Caja rígida + tarjeta de autenticidad",
         "montura,acetato,armani,elegante", 2),
        ("Armazón Monastery Couture C5", "Monastery Couture", "Montura", "Unisex",
         "IMG-20260906-WA0004.jpg",
         "Montura estilo caret/havanna en acetato de alto brillo, con acabado carey cálido y detalles dorados. Montaje robusto de alta calidad. Incluye estuche rígido azul.",
         "Color: Havanna carey|Material: Acetato brillo|Forma: Rectangular redondeada|Acabado: Alto brillo|Incluye: Estuche rígido",
         "montura,carey,havanna,acetato", 3),
        ("Armazón Calvin Klein Jeans 003", "Calvin Klein", "Montura", "Unisex",
         "IMG-20260906-WA0005.jpg",
         "Montura translúcida crystal gris, estilo moderno y juvenil de Calvin Klein Jeans. Acetato ultraligero con marca CK grabada. Incluye estuche rígido blanco original.",
         "Color: Gris crystal translúcido|Material: Acetato ultraligero|Forma: Rectangular|Grabado: Logo CK|Incluye: Estuche rígido blanco",
         "montura,crystal,calvin klein,moderno", 4),
        ("Cat-eye Metálico Lila", "FixLens", "Montura", "Mujer",
         "motion_photo_8245738312449213564.jpg",
         "Elegante montura de gota de gato para mujer en metal fino con acabado púrpura degradado. Ligerísima y resistente, ideal para un look sofisticado.",
         "Forma: Gota de gato (cat-eye)|Material: Metal ultraligero|Color: Lila degradado|Género: Mujer|Extras: Lentes con filtro de luz azul",
         "montura,mujer,cat-eye,metal", 5),
        ("Armazón Crystal Azul TR Eyewear", "TR Eyewear", "Montura", "Unisex",
         "motion_photo_8958689227212766435.jpg",
         "Montura rectangular unisex en acetato translúcido azul gris, ligera y resistente. Incluye lentes con bloqueo de luz azul, perfecta para uso diario frente a pantallas.",
         "Color: Azul gris translúcido|Material: Acetato TR|Forma: Rectangular|Género: Unisex|Lentes: Bloqueo de luz azul",
         "montura,unisex,translucido,luz azul", 6),
        ("Cat-eye Gris Translúcido TR Eyewear", "TR Eyewear", "Montura", "Mujer",
         "motion_photo_3655567891324459051.jpg",
         "Montura cat-eye en gris translúcido con acabado brillante. Diseño moderno y versátil con lentes de bloqueo de luz azul para mayor comodidad visual.",
         "Forma: Gota de gato|Color: Gris translúcido|Material: Acetato|Género: Mujer|Lentes: Bloqueo de luz azul",
         "montura,mujer,cat-eye,luz azul", 7),
        ("Browline Dark Classic", "FixLens", "Montura", "Unisex",
         "motion_photo_7133488038514402350.jpg",
         "Montura estilo browline, con frente superior en acetato oscuro y zona de lentes transparente. Clásica, atemporal y perfecta para uso formal o casual.",
         "Estilo: Browline|Color: Oscuro con frente claro|Material: Acetato|Forma: Rectangular|Género: Unisex",
         "montura,browline,clasico,unisex", 8),
        ("Cat-eye FANDIA Granate", "FANDIA", "Montura", "Mujer",
         "motion_photo_2073568778373024877.jpg",
         "Montura FANDIA para mujer en tono granate/lila translúcido, gota de gato elegante y ligera. Acabados suaves y modernos.",
         "Marca: FANDIA|Forma: Gota de gato|Color: Granate translúcido|Género: Mujer|Material: Acetato",
         "montura,mujer,fandia,cat-eye", 9),
        ("Cat-eye Negro Half-Rim", "FixLens", "Montura", "Mujer",
         "motion_photo_1239520568868812206.jpg",
         "Montura negra gota de gato con delicados acentos azules y patillas translúcidas. Ligera, moderna y de gran presencia, ideal para rosto femenino.",
         "Forma: Gota de gato|Color: Negro con acentos azules|Diseño: Half-rim|Género: Mujer|Material: Acetato",
         "montura,mujer,negro,cat-eye", 10),
        ("Cat-eye Oversize Rosa", "FixLens", "Montura", "Mujer",
         "motion_photo_5283908375622350339.jpg",
         "Montura oversize gota de gato en rosado translúcido, estilo glam con detalles dorados en las patillas. Tendencia y elegancia en un solo diseño.",
         "Forma: Gota de gato oversize|Color: Rosa translúcido|Detalles: Herrajes dorados|Género: Mujer|Material: Acetato",
         "montura,mujer,oversize,rosa", 11),
        ("Havanna Browline Retro", "FixLens", "Montura", "Unisex",
         "motion_photo_6752046002917143360.jpg",
         "Montura browline retro en carey havanna con frente translúcido y patillas claras. Un diseño vintage renovado con vibras de los años 70 y 80.",
         "Estilo: Browline retro|Color: Carey havanna|Material: Acetato|Forma: Rectangular|Género: Unisex",
         "montura,browline,retro,carey", 12),
    ]
    for p in products:
        c.execute(
            """INSERT INTO products(name, brand, category, gender, image, description, features, tags, sort_order)
               VALUES(?,?,?,?,?,?,?,?,?)""",
            p,
        )
    reviews = [
        ("María Fernanda", 5, "Excelente atención, me asesoraron y elegí mis lentes perfectos. La calidad es increíble.",
         "2026-08-12"),
        ("Carlos Rodríguez", 5, "Muy profesionales, los lentes llegaron rapidísimo y de excelente calidad. 100% recomendado.",
         "2026-08-20"),
        ("Luisa Gómez", 5, "Los mejores lentes que he tenido. El diseño y la calidad de FixLens no tienen comparación.",
         "2026-08-25"),
        ("Andrés Pérez", 4, "Buena atención y gran variedad de monturas. El lugar está súper bien ubicado.",
         "2026-09-02"),
    ]
    for r in reviews:
        c.execute(
            "INSERT INTO reviews(name, rating, comment, date, approved) VALUES(?,?,?,?,1)",
            r,
        )


def json_response(handler, data, status=200):
    body = json.dumps(data, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler._cors()
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def get_settings(conn):
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    return {r["key"]: r["value"] for r in rows}


class FixLensHandler(BaseHTTPRequestHandler):
    server_version = "FixLens/1.0"

    def log_message(self, fmt, *args):
        pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def _read_json(self):
        length = int(self.headers.get("Content-Length", 0) or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return {}

    def _route_get(self):
        path = self.path.split("?")[0]
        if path in ("/", ""):
            self._send_file("index.html", "text/html; charset=utf-8")
        elif path == "/admin":
            self._send_file("admin.html", "text/html; charset=utf-8")
        elif path.startswith("/assets/"):
            self._send_file(path.replace("/assets/", "assets/"), self._mime(path))
        elif path.startswith("/images/"):
            self._send_file(path.replace("/images/", "images/"), self._mime(path))
        elif path == "/api/products":
            self._api_list_products()
        elif path == "/api/reviews":
            self._api_list_reviews()
        elif path == "/api/settings-public":
            self._api_settings_public()
        elif path == "/api/order-latest":
            self._api_order_latest()
        else:
            self._not_found()

    def _route_post(self):
        path = self.path.split("?")[0]
        body = self._read_json()
        if path == "/api/reviews":
            self._api_create_review(body)
        elif path == "/api/admin/login":
            self._api_login(body)
        elif path == "/api/admin/products":
            self._api_get_seed(body)
        elif path == "/api/admin/products/save":
            self._api_save_product(body)
        elif path == "/api/admin/orders":
            self._api_get_orders(body)
        elif path == "/api/admin/reviews":
            self._api_admin_reviews(body)
        elif path == "/api/admin/images":
            self._api_images(body)
        elif path.startswith("/api/admin/reviews/"):
            self._api_update_review(path, body)
        elif path == "/api/admin/settings":
            self._api_settings(body)
        elif path == "/api/admin/settings/get":
            self._api_settings_get()
        elif path == "/api/order":
            self._api_create_order(body)
        elif path == "/api/checkout":
            self._api_checkout(body)
        else:
            self._not_found()

    def _route_put(self):
        pass

    def _route_delete(self):
        path = self.path.split("?")[0]
        if path.startswith("/api/admin/products/"):
            self._api_delete_product(path)
        elif path.startswith("/api/admin/reviews/"):
            self._api_delete_review(path)
        else:
            self._not_found()

    def do_GET(self):
        self.dispatch("GET")

    def do_POST(self):
        self.dispatch("POST")

    def do_PUT(self):
        self.dispatch("PUT")

    def do_DELETE(self):
        self.dispatch("DELETE")

    def dispatch(self, method):
        if method == "GET":
            self._route_get()
        elif method == "POST":
            self._route_post()
        elif method == "PUT":
            self._route_put()
        elif method == "DELETE":
            self._route_delete()

    def _send_file(self, rel, ctype):
        target = (BASE_DIR / rel).resolve()
        if not str(target).startswith(str(BASE_DIR.resolve())) or not target.exists():
            self._not_found()
            return
        data = target.read_bytes()
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)

    def _mime(self, path):
        ext = os.path.splitext(path)[1].lower()
        return {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
            ".ico": "image/x-icon",
        }.get(ext, "application/octet-stream")

    def _not_found(self):
        body = json.dumps({"error": "Not found"}).encode()
        self.send_response(404)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _api_list_products(self):
        conn = get_db()
        rows = conn.execute(
            "SELECT * FROM products WHERE active=1 ORDER BY sort_order ASC"
        ).fetchall()
        conn.close()
        products = []
        for r in rows:
            products.append(self._row_product(r))
        json_response(self, {"products": products})

    def _row_product(self, r):
        return {
            "id": r["id"],
            "name": r["name"],
            "brand": r["brand"],
            "category": r["category"],
            "gender": r["gender"],
            "image": r["image"],
            "description": r["description"],
            "features": (r["features"] or "").split("|") if r["features"] else [],
            "tags": (r["tags"] or "").split(",") if r["tags"] else [],
        }

    def _api_list_reviews(self):
        conn = get_db()
        rows = conn.execute(
            "SELECT * FROM reviews WHERE approved=1 ORDER BY date DESC"
        ).fetchall()
        conn.close()
        json_response(self, {"reviews": [dict(r) for r in rows]})

    def _api_settings_public(self):
        conn = get_db()
        s = get_settings(conn)
        conn.close()
        json_response(self, {
            "whatsapp": s.get("store_whatsapp", WHATSAPP),
            "address": s.get("store_address", ""),
            "hours": s.get("store_hours", ""),
            "wompi_enabled": bool(s.get("wompi_public_key")),
        })

    def _api_create_review(self, body):
        name = (body.get("name") or "").strip()
        rating = int(body.get("rating") or 5)
        comment = (body.get("comment") or "").strip()
        if not name or not comment:
            json_response(self, {"error": "Completa tu nombre y comentario"}, 400)
            return
        from datetime import datetime
        conn = get_db()
        conn.execute(
            "INSERT INTO reviews(name, rating, comment, date, approved) VALUES(?,?,?,?,0)",
            (name, max(1, min(5, rating)), comment, datetime.now().strftime("%Y-%m-%d")),
        )
        conn.commit()
        conn.close()
        json_response(self, {"ok": True})

    # ---- Admin auth ----
    def _bearer(self):
        h = self.headers.get("Authorization", "")
        if h.startswith("Bearer "):
            return h[7:]
        return None

    def _require_admin(self, conn):
        token = self._bearer()
        if not token:
            return None
        info = sessions.get(token)
        if not info or info.get("exp") < time.time():
            sessions.pop(token, None)
            return None
        return info

    def _api_login(self, body):
        username = (body.get("username") or "").strip()
        password = body.get("password") or ""
        conn = get_db()
        row = conn.execute(
            "SELECT * FROM admins WHERE username=?", (username,)
        ).fetchone()
        conn.close()
        if row and verify_password(password, row["password_hash"]):
            token = secrets.token_hex(32)
            sessions[token] = {"exp": time.time() + 86400, "user": username}
            json_response(self, {"ok": True, "token": token})
        else:
            json_response(self, {"error": "Credenciales inválidas"}, 401)

    def _api_get_seed(self, body):
        conn = get_db()
        if not self._require_admin(conn):
            conn.close()
            json_response(self, {"error": "No autorizado"}, 401)
            return
        rows = conn.execute(
            "SELECT * FROM products ORDER BY sort_order ASC"
        ).fetchall()
        conn.close()
        products = []
        for r in rows:
            p = self._row_product(r)
            p["active"] = r["active"]
            products.append(p)
        json_response(self, {"products": products})

    def _api_get_orders(self, body):
        conn = get_db()
        if not self._require_admin(conn):
            conn.close()
            json_response(self, {"error": "No autorizado"}, 401)
            return
        rows = conn.execute("SELECT * FROM orders ORDER BY id DESC").fetchall()
        conn.close()
        json_response(self, {"orders": [dict(r) for r in rows]})

    def _api_save_product(self, body):
        conn = get_db()
        if not self._require_admin(conn):
            conn.close()
            json_response(self, {"error": "No autorizado"}, 401)
            return
        name = (body.get("name") or "").strip()
        if not name:
            conn.close()
            json_response(self, {"error": "El nombre es requerido"}, 400)
            return
        vals = (
            name,
            body.get("brand", ""),
            body.get("category", ""),
            body.get("gender", ""),
            body.get("image", ""),
            body.get("description", ""),
            body.get("features", ""),
            body.get("tags", ""),
            int(body.get("sort_order") or 0),
            int(body.get("active", 1)),
        )
        pid = body.get("id")
        if pid:
            conn.execute(
                """UPDATE products SET name=?, brand=?, category=?, gender=?, image=?,
                   description=?, features=?, tags=?, sort_order=?, active=? WHERE id=?""",
                vals + (pid,),
            )
        else:
            cur = conn.execute(
                """INSERT INTO products(name, brand, category, gender, image, description,
                   features, tags, sort_order, active) VALUES(?,?,?,?,?,?,?,?,?,?)""",
                vals,
            )
            pid = cur.lastrowid
        conn.commit()
        conn.close()
        json_response(self, {"ok": True, "id": pid})

    def _api_admin_reviews(self, body):
        conn = get_db()
        if not self._require_admin(conn):
            conn.close()
            json_response(self, {"error": "No autorizado"}, 401)
            return
        rows = conn.execute("SELECT * FROM reviews ORDER BY id DESC").fetchall()
        conn.close()
        json_response(self, {"reviews": [dict(r) for r in rows]})

    def _api_update_review(self, path, body):
        rid = path.rsplit("/", 1)[-1]
        conn = get_db()
        if not self._require_admin(conn):
            conn.close()
            json_response(self, {"error": "No autorizado"}, 401)
            return
        approved = int(body.get("approved", 0))
        conn.execute("UPDATE reviews SET approved=? WHERE id=?", (approved, rid))
        conn.commit()
        conn.close()
        json_response(self, {"ok": True})

    def _api_images(self, body):
        conn = get_db()
        if not self._require_admin(conn):
            conn.close()
            json_response(self, {"error": "No autorizado"}, 401)
            return
        conn.close()
        files = sorted([f.name for f in IMAGES_DIR.iterdir() if f.is_file()])
        json_response(self, {"images": files})

    def _api_settings(self, body):
        conn = get_db()
        if not self._require_admin(conn):
            conn.close()
            json_response(self, {"error": "No autorizado"}, 401)
            return
        allowed = [
            "wompi_public_key", "wompi_private_key", "wompi_integrity_key",
            "wompi_env", "store_whatsapp", "store_address", "store_hours",
        ]
        for k in allowed:
            if k in body:
                conn.execute(
                    "INSERT INTO settings(key,value) VALUES(?,?) "
                    "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                    (k, str(body[k])),
                )
        conn.commit()
        conn.close()
        json_response(self, {"ok": True, "settings": body})

    def _api_settings_get(self):
        conn = get_db()
        if not self._require_admin(conn):
            conn.close()
            json_response(self, {"error": "No autorizado"}, 401)
            return
        s = get_settings(conn)
        conn.close()
        json_response(self, {"settings": s})

    def _api_delete_product(self, path):
        pid = path.rsplit("/", 1)[-1]
        conn = get_db()
        if not self._require_admin(conn):
            conn.close()
            json_response(self, {"error": "No autorizado"}, 401)
            return
        conn.execute("DELETE FROM products WHERE id=?", (pid,))
        conn.commit()
        conn.close()
        json_response(self, {"ok": True})

    def _api_delete_review(self, path):
        rid = path.rsplit("/", 1)[-1]
        conn = get_db()
        if not self._require_admin(conn):
            conn.close()
            json_response(self, {"error": "No autorizado"}, 401)
            return
        conn.execute("DELETE FROM reviews WHERE id=?", (rid,))
        conn.commit()
        conn.close()
        json_response(self, {"ok": True})

    def _api_create_order(self, body):
        conn = get_db()
        s = get_settings(conn)
        product_name = (body.get("product_name") or "").strip()
        customer_name = (body.get("customer_name") or "").strip()
        customer_phone = (body.get("customer_phone") or "").strip()
        customer_email = (body.get("customer_email") or "").strip()
        customer_address = (body.get("customer_address") or "").strip()
        reference = "FXL-" + secrets.token_hex(4).upper()
        from datetime import datetime
        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        conn.execute(
            """INSERT INTO orders(reference, product_name, customer_name, customer_phone,
               customer_email, customer_address, amount_cents, currency, status, channel, created)
               VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
            (reference, product_name, customer_name, customer_phone, customer_email,
             customer_address, 0, "COP", "pendiente", "whatsapp", now),
        )
        conn.commit()
        conn.close()
        msg = (
            f"*Nueva cotización en FixLens*\n"
            f"Referencia: {reference}\n"
            f"Producto: {product_name}\n"
            f"Nombre: {customer_name}\n"
            f"Teléfono: {customer_phone}\n"
            f"Correo: {customer_email}\n"
            f"Dirección: {customer_address}"
        )
        wa = "https://wa.me/%s?text=%s" % (s.get("store_whatsapp", WHATSAPP), urllib.parse.quote(msg))
        json_response(self, {"ok": True, "reference": reference, "whatsapp": wa})

    def _api_checkout(self, body):
        conn = get_db()
        s = get_settings(conn)
        public_key = s.get("wompi_public_key", "")
        private_key = s.get("wompi_private_key", "")
        integrity_key = s.get("wompi_integrity_key", "")
        env = s.get("wompi_env", "test")
        if not public_key or not private_key or not integrity_key:
            conn.close()
            json_response(self, {"error": "Pasarela no configurada", "fallback": "whatsapp"}, 400)
            return
        product_name = (body.get("product_name") or "").strip()
        customer_email = (body.get("customer_email") or "").strip()
        customer_phone = (body.get("customer_phone") or "").strip()
        customer_name = (body.get("customer_name") or "").strip()
        amount_cents = int(body.get("amount_cents") or 0)
        if amount_cents <= 0:
            conn.close()
            json_response(self, {"error": "Monto no válido", "fallback": "whatsapp"}, 400)
            return
        reference = "FXL-" + secrets.token_hex(4).upper()
        redirect_url = "https://checkout.wompi.co/payment"
        base = "https://production.wompi.co"
        if env == "test":
            base = "https://sandbox.wompi.co"
        payload = {
            "amount_in_cents": amount_cents,
            "currency": "COP",
            "customer_email": customer_email,
            "reference": reference,
            "payment_method": {"type": "PSE", "user_phone_number": customer_phone},
            "redirect_url": redirect_url,
            "customer_data": {
                "phone_number": customer_phone,
                "full_name": customer_name,
            },
        }
        import urllib.request
        req = urllib.request.Request(
            base + "/v1/transactions",
            data=json.dumps(payload).encode(),
            headers={
                "Authorization": "Bearer " + str(private_key),
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode())
            if data.get("data", {}).get("id"):
                from datetime import datetime
                conn.execute(
                    """INSERT INTO orders(reference, product_name, customer_name, customer_phone,
                       customer_email, amount_cents, currency, status, channel, created)
                       VALUES(?,?,?,?,?,?,?,'pendiente','wompi',?)""",
                    (reference, product_name, customer_name, customer_phone, customer_email,
                     amount_cents, "COP", datetime.now().strftime("%Y-%m-%d %H:%M")),
                )
                conn.commit()
                conn.close()
                json_response(self, {
                    "ok": True, "reference": reference,
                    "redirect_url": data["data"]["_links"]["redirect_url"],
                })
                return
        except Exception as e:
            conn.close()
            json_response(self, {"error": "Error al generar el pago: " + str(e), "fallback": "whatsapp"}, 500)
            return
        conn.close()
        json_response(self, {"error": "No se pudo iniciar el pago", "fallback": "whatsapp"}, 500)

    def _api_order_latest(self):
        conn = get_db()
        rows = conn.execute(
            "SELECT * FROM orders ORDER BY id DESC LIMIT 1"
        ).fetchall()
        conn.close()
        json_response(self, {"orders": [dict(r) for r in rows]})


def main():
    init_db()
    port = int(os.environ.get("PORT", "8000"))
    handler = FixLensHandler
    httpd = ThreadingHTTPServer(("0.0.0.0", port), handler)
    print(f"FixLens corriendo en http://localhost:{port}")
    print(f"Panel admin: http://localhost:{port}/admin")
    print(f"Usuario: {ADMIN_DEFAULT_USER} | Contraseña: {ADMIN_DEFAULT_PASS}")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
