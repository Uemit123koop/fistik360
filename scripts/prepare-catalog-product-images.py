#!/usr/bin/env python3
"""Normalize the 45 canonical catalog cutouts to transparent 4K PNGs."""

from __future__ import annotations
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

SLUGS = (
    "antep-fistigi-kavrulmus", "antep-fistigi-cig", "antep-fistigi-ici",
    "badem-kavrulmus", "badem-cig", "findik-kavrulmus", "findik-cig",
    "kaju-kavrulmus", "kaju-cig", "ceviz-ici", "yer-fistigi-tuzlu",
    "yer-fistigi-tuzsuz", "sari-leblebi", "beyaz-leblebi", "soslu-misir",
    "kabak-cekirdegi", "ay-cekirdegi-tuzlu", "ay-cekirdegi-tuzsuz",
    "karisik-kuruyemis-klasik", "karisik-kuruyemis-luks", "kokteyl-kuruyemis",
    "kuru-kayisi", "gun-kurusu-kayisi", "kuru-incir", "cekirdeksiz-kuru-uzum",
    "hurma", "medine-hurmasi", "kuru-dut", "kuru-erik", "turna-yemisi",
    "kuru-mango", "kuru-ananas", "kuru-elma", "pestil", "cevizli-sucuk",
    "lokum-sade", "lokum-gullu", "lokum-antep-fistikli",
    "lokum-cifte-kavrulmus", "lokum-narli", "lokum-kadayifli", "draje-badem",
    "draje-findik", "kahve-cekirdegi", "turk-kahvesi",
)
CANVAS_SIZE = 4096
MAX_PRODUCT_WIDTH = 2920
MAX_PRODUCT_HEIGHT = 2480
PRODUCT_CENTER_Y = 1950

def normalize(source: Path, destination: Path) -> tuple[int, int, int]:
    with Image.open(source) as image:
        rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    if alpha.getextrema()[0] == 255:
        raise ValueError(f"{source.name}: alpha transparency is missing")
    alpha = alpha.filter(ImageFilter.MinFilter(3))
    rgba.putalpha(alpha)
    bbox = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
    if bbox is None:
        raise ValueError(f"{source.name}: no visible product pixels")
    product = rgba.crop(bbox)
    scale = min(MAX_PRODUCT_WIDTH / product.width, MAX_PRODUCT_HEIGHT / product.height)
    size = (max(1, round(product.width * scale)), max(1, round(product.height * scale)))
    product = product.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    left = (CANVAS_SIZE - product.width) // 2
    top = round(PRODUCT_CENTER_Y - product.height / 2)
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    shadow_width = round(product.width * 0.72)
    shadow_height = max(90, round(product.height * 0.09))
    shadow_left = (CANVAS_SIZE - shadow_width) // 2
    shadow_top = top + product.height - round(shadow_height * 0.72)
    draw.ellipse((shadow_left, shadow_top, shadow_left + shadow_width, shadow_top + shadow_height), fill=(66, 46, 29, 42))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(radius=54)))
    canvas.alpha_composite(product, (left, top))
    corners = (canvas.getpixel((0, 0))[3], canvas.getpixel((4095, 0))[3], canvas.getpixel((0, 4095))[3], canvas.getpixel((4095, 4095))[3])
    if any(corners):
        raise ValueError(f"{source.name}: canvas corners are not transparent")
    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination, "PNG", optimize=True, compress_level=9)
    return product.width, product.height, destination.stat().st_size

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=Path("tmp/imagegen/catalog-alpha"))
    parser.add_argument("--output", type=Path, default=Path("supabase/catalog-product-images"))
    args = parser.parse_args()
    actual, expected = {path.stem for path in args.input.glob("*.png")}, set(SLUGS)
    if actual != expected:
        raise SystemExit(f"Catalog image set mismatch. Missing={sorted(expected - actual)}; extra={sorted(actual - expected)}")
    total_bytes = 0
    for slug in SLUGS:
        width, height, size = normalize(args.input / f"{slug}.png", args.output / f"{slug}.png")
        total_bytes += size
        print(f"OK {slug}: product={width}x{height}, file={size / 1048576:.2f} MiB")
    print(f"Prepared {len(SLUGS)} transparent 4K PNGs ({total_bytes / 1048576:.1f} MiB total).")

if __name__ == "__main__":
    main()
