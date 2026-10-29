#!/usr/bin/env python3
"""Photography section: turns whatever is in assets/photos/ into what the website shows.

You only ever do two things:
  1. Drop photos into assets/photos/ (JPG, PNG, HEIC, WebP or TIFF, any size).
  2. Optionally edit assets/photos/order.txt to change the order or add captions.

This script (run automatically by GitHub after every upload, see .github/workflows/photos.yml) then:
  - converts each photo to a web-sized JPEG (2000px on the long side), removing hidden camera/location data,
  - makes a smaller copy for the grid in assets/photos/small/,
  - adds any new photos to the end of order.txt,
  - writes assets/photos/photos.json, which the Work page reads.

order.txt format: one photo per line, top = first on the page. Add a caption after a | if you want one:
    jellyfish.jpg | London Aquarium, 2026
Lines starting with # are notes. Delete a line (or the photo) to remove it from the page.
"""
import hashlib, json, os, re, sys
from PIL import Image, ImageOps

try:  # iPhone photos
    from pillow_heif import register_heif_opener
    register_heif_opener()
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, "assets", "photos")
SMALL = os.path.join(DIR, "small")
ORDER = os.path.join(DIR, "order.txt")
OUT = os.path.join(DIR, "photos.json")
EXTS = (".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp", ".tif", ".tiff")
FULL, THUMB = 2000, 900

HEADER = """# Photography on the Work page — one photo per line, top = shown first.
# Add a caption after a | if you like, e.g.:  jellyfish.jpg | London Aquarium, 2026
# New photos you upload are added to the bottom automatically. Lines starting with # are ignored.
"""


def web_name(fn):
    base = os.path.splitext(fn)[0]
    base = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-") or "photo"
    return base + ".jpg"


def needs_work(path):
    if not path.lower().endswith((".jpg", ".jpeg")):
        return True
    with Image.open(path) as im:
        return max(im.size) > FULL or bool(im.info.get("exif")) or bool(im.getexif())


def process(fn):
    """Convert one uploaded file to the web version; returns the web file name."""
    src = os.path.join(DIR, fn)
    name = web_name(fn)
    dst = os.path.join(DIR, name)
    if src != dst or needs_work(src):
        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im).convert("RGB")
            im.thumbnail((FULL, FULL), Image.LANCZOS)
            im.save(dst + ".tmp", "JPEG", quality=86, optimize=True, progressive=True)  # no metadata kept
        os.replace(dst + ".tmp", dst)
        if src != dst:
            os.remove(src)
        print("processed", fn, "->", name)
    small = os.path.join(SMALL, name)
    if not os.path.exists(small) or os.path.getmtime(small) < os.path.getmtime(dst):
        with Image.open(dst) as im:
            im = im.convert("RGB")
            im.thumbnail((THUMB, THUMB), Image.LANCZOS)
            im.save(small, "JPEG", quality=84, optimize=True, progressive=True)
    return name


def main():
    os.makedirs(SMALL, exist_ok=True)
    files = sorted(f for f in os.listdir(DIR) if f.lower().endswith(EXTS) and os.path.isfile(os.path.join(DIR, f)))
    names = {}
    for f in files:
        try:
            names[f] = process(f)
        except Exception as e:  # a broken upload shouldn't stop the others
            print("skipped", f, "-", e, file=sys.stderr)
    present = set(names.values())

    # Read order.txt (accept the original upload name too, e.g. "IMG_1234.HEIC" -> img-1234.jpg)
    entries, seen = [], set()
    if os.path.exists(ORDER):
        for line in open(ORDER, encoding="utf-8"):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            fn, _, cap = line.partition("|")
            fn = fn.strip()
            name = names.get(fn, web_name(fn))
            if name in present and name not in seen:
                entries.append((name, cap.strip()))
                seen.add(name)
    for name in sorted(present - seen):  # new uploads go to the end
        entries.append((name, ""))

    with open(ORDER, "w", encoding="utf-8") as f:
        f.write(HEADER + "\n" + "".join(f"{n} | {c}\n" if c else f"{n}\n" for n, c in entries))

    # Remove grid copies of photos that were deleted
    for s in os.listdir(SMALL):
        if s not in present:
            os.remove(os.path.join(SMALL, s))

    # Keep any screen-reader descriptions ("alt") already written into photos.json by hand
    old = {}
    if os.path.exists(OUT):
        try:
            old = {d["src"].split("?")[0]: d.get("alt", "") for d in json.load(open(OUT, encoding="utf-8"))}
        except Exception:
            pass
    data = []
    for n, c in entries:
        with Image.open(os.path.join(DIR, n)) as im:
            w, h = im.size
        v = hashlib.md5(open(os.path.join(DIR, n), "rb").read()).hexdigest()[:8]   # changes whenever the photo is replaced
        d = {"src": f"assets/photos/{n}?v={v}", "thumb": f"assets/photos/small/{n}?v={v}", "caption": c, "w": w, "h": h}
        if old.get(f"assets/photos/{n}"):
            d["alt"] = old[f"assets/photos/{n}"]
        data.append(d)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print(f"{len(data)} photos in photos.json")


if __name__ == "__main__":
    main()
