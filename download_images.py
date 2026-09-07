import io
import os
import sys
import requests

FILE_IDS = [
    "12ANl2_w1fGhXbdEXsFYGQHcgKf4XnKE0",
    "1uOilH2Jv_sL4ev4ml0OLUhagSqOLHh1F",
    "1kb98pqNAyiP1DZoIlGNcsceNQ2YfOfWv",
    "1OT3TTO5-bRrOFgc2K1AUJOtHjuv46hid",
    "1me4tiIaaBJ8vVmu_2AdsfcT2hO4btSc6",
    "1wIywAyLfS-aOBpjZCb_5guofdk08uvGY",
    "1279_1HWO-il7HZquqWTT9s-KNVhdy67h",
    "1oniW5FISr2ZqqrX7SkbYCbX0uR9x6yJJ",
    "1FJNN-3sdHN4VT7reuiLfn0BfTMKIAcQ6",
    "1YaLQF6f79qaUi-iAOZly57INaYNfBENM",
    "1l84ZUiSO7U9NrCu11H68C6Qd7P29ObUr",
    "1uerMUG69CUcz6IXjD--NaFC9xQd6p3Wy",
]

BASE = r"C:\Users\pc\Documents\Default Project\fixlens\images"
os.makedirs(BASE, exist_ok=True)


def download(fid, index):
    session = requests.Session()
    url = "https://drive.google.com/uc?export=download&id=" + fid
    resp = session.get(url, stream=True, allow_redirects=True)
    cd = resp.headers.get("Content-Disposition", "")
    name = cd.split("filename=\"")[-1].split("\"")[0]
    if not name or name == "" or "id=" in name.lower():
        # fallback: extract from confirm form if present
        text = resp.text
        name = None
        if "filename=" in text:
            # look inside html
            import re
            m = re.search(r"filename=\"([^\"]+)\"", text)
            if m:
                name = m.group(1)
        if not name:
            name = f"image_{index:02d}"
    # sanitize
    name = os.path.basename(name.replace("\\", "/"))
    if not name.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".avif")):
        name = f"image_{index:02d}" + os.path.splitext(name or "")[1]

    out = os.path.join(BASE, name)

    # Handle large-file / virus-scan confirm via the next 'confirm' POST
    if "googleusercontent" in str(resp.headers.get("Content-Type", "")) or "virus scan" in resp.text.lower():
        import re
        m = re.search(r"confirm=([0-9A-Za-z_\-]+)", resp.text)
        confirm = m.group(1) if m else None
        if confirm:
            url2 = "https://drive.google.com/uc?export=download&confirm=%s&id=%s" % (confirm, fid)
            resp = session.get(url2, stream=True, allow_redirects=True)

    ok = False
    data = b""
    if resp.status_code == 200 and "text/html" not in str(resp.headers.get("Content-Type", "")):
        data = resp.content
        ok = len(data) > 1000
    if not ok:
        # try small file direct content
        direct = "https://drive.usercontent.google.com/download?id=%s&export=download" % fid
        r2 = session.get(direct, stream=True, allow_redirects=True)
        if r2.status_code == 200 and "text/html" not in str(r2.headers.get("Content-Type", "")):
            data = r2.content
            ok = True
    if not ok:
        # confirm token path on usercontent
        import re
        if "confirm=" in resp.text:
            m = re.search(r"confirm=([0-9A-Za-z_\-]+)", resp.text)
            confirm = m.group(1) if m else None
            if confirm:
                direct = "https://drive.usercontent.google.com/download?id=%s&export=download&confirm=%s" % (fid, confirm)
                r3 = session.get(direct, stream=True, allow_redirects=True)
                data = r3.content
                ok = r3.status_code == 200 and len(data) > 1000

    if ok:
        with open(out, "wb") as f:
            f.write(data)
        print(f"[OK]  {index:02d} -> {name} ({len(data)} bytes)")
    else:
        print(f"[FAIL] {index:02d} -> {name}: status {resp.status_code}, len {len(data)}")


for i, fid in enumerate(FILE_IDS, 1):
    try:
        download(fid, i)
    except Exception as e:
        print(f"[ERR] {i} {fid}: {e}")
