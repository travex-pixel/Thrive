"""Generates the small, committed E2E fixtures.

Run with a Python that has Pillow, pillow-heif and pypdf installed:
    python tests/fixtures/generate.py

Large fixtures (oversized scans, many-page statements) are generated at test
time by tests/e2e/global-setup.ts instead, so the repo stays small.
"""
from pathlib import Path
import io
import random

from PIL import Image, ImageDraw
import pillow_heif
from pypdf import PdfReader, PdfWriter

OUT = Path(__file__).parent
random.seed(7)


def photo(w: int, h: int, hue: int) -> Image.Image:
    img = Image.new("RGB", (w, h), (hue, 120, 200 - hue // 2))
    d = ImageDraw.Draw(img)
    for _ in range(60):
        x, y = random.randint(0, w), random.randint(0, h)
        r = random.randint(20, 160)
        d.ellipse((x - r, y - r, x + r, y + r), fill=(random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)))
    d.text((40, 40), "LodgeReady test photo", fill=(255, 255, 255))
    return img


def jpeg_with_exif(path: Path, when: str, w=3024, h=4032):
    img = photo(w, h, 60)
    exif = Image.Exif()
    exif[0x9003] = when  # DateTimeOriginal (in the Exif IFD)
    exif[0x0132] = when  # DateTime
    ifd = exif.get_ifd(0x8769)
    ifd[0x9003] = when
    img.save(path, "JPEG", quality=92, exif=exif)


def text_pdf_bytes(lines: list[str]) -> bytes:
    # Minimal PDF with real text, built via Pillow -> PDF is image-only, so use pypdf blank + annotation-free text.
    # Simpler: draw text on an image page; good enough for the "locked" fixture which is re-rendered anyway.
    img = Image.new("RGB", (1240, 1754), "white")
    d = ImageDraw.Draw(img)
    for i, line in enumerate(lines):
        d.text((100, 120 + i * 40), line, fill=(20, 20, 20))
    buf = io.BytesIO()
    img.save(buf, "PDF", resolution=150)
    return buf.getvalue()


def main():
    # 1. iPhone-style photo with an EXIF date (no date in the file name).
    jpeg_with_exif(OUT / "IMG_4821.JPG", "2024:03:15 18:22:01")

    # 2. A real HEIC photo, as AirDropped from an iPhone.
    pillow_heif.register_heif_opener()
    photo(1512, 2016, 140).save(OUT / "IMG_5530.HEIC", format="HEIF", quality=80)

    # 3. A chat screenshot PNG with a date in the name.
    shot = Image.new("RGB", (1179, 2556), (240, 240, 245))
    d = ImageDraw.Draw(shot)
    for i in range(18):
        x = 60 if i % 2 == 0 else 420
        d.rounded_rectangle((x, 160 + i * 130, x + 700, 260 + i * 130), radius=30, fill=(0, 122, 255) if i % 2 else (229, 229, 234))
    shot.save(OUT / "Screenshot 2025-01-09 at 21.14.03.png")

    # 4. A WEBP image (not accepted by ImmiAccount, so it must be converted).
    photo(1600, 1200, 30).save(OUT / "Holiday Bali 2024-07-12.webp", "WEBP", quality=80)

    # 5. A "secured" bank statement: owner-password only (opens without a password).
    src = PdfReader(io.BytesIO(text_pdf_bytes(["Joint account statement", "1 March 2025 - 31 March 2025", "Balance $1,234.56"])))
    w = PdfWriter()
    for p in src.pages:
        w.add_page(p)
    w.encrypt(user_password="", owner_password="bank-owner-secret", permissions_flag=0b0100)
    with open(OUT / "CBA statement March 2025 (secured).pdf", "wb") as f:
        w.write(f)

    # 6. A PDF that needs a password to open.
    w2 = PdfWriter()
    for p in PdfReader(io.BytesIO(text_pdf_bytes(["Private document"]))).pages:
        w2.add_page(p)
    w2.encrypt(user_password="open-sesame", owner_password="owner")
    with open(OUT / "Payslip (password).pdf", "wb") as f:
        w2.write(f)

    # 7. A pass-through Office file and an unsupported file.
    (OUT / "Relationship statement.docx").write_bytes(b"PK\x03\x04" + b"\x00" * 2048)
    (OUT / "video.mov").write_bytes(b"\x00\x00\x00\x18ftypqt  " + b"\x00" * 1024)

    for p in sorted(OUT.iterdir()):
        if p.suffix != ".py":
            print(f"{p.name:48s} {p.stat().st_size:>9,d} bytes")


if __name__ == "__main__":
    main()
