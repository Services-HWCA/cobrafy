"""Genera los iconos PNG de Cobrofy (PWA, manifest y apple-touch-icon).

Uso: python scripts/generate-icons.py
Requiere Pillow (pip install pillow).
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "icons"
APPLE_OUT = ROOT / "app" / "apple-icon.png"

BLACK = (9, 9, 11, 255)       # zinc-950
EMERALD = (52, 211, 153, 255)  # emerald-400
GLYPH = (9, 9, 11, 255)

FONT_PATH = r"C:\Windows\Fonts\arialbd.ttf"


def rounded_rect(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def draw_glyph(size, inner_ratio=0.62):
    """Icono con fondo transparente y esquinas redondeadas (icon-*.png)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    rounded_rect(draw, (0, 0, size, size), size * 0.22, BLACK)

    inner = size * inner_ratio
    offset = (size - inner) / 2
    rounded_rect(draw, (offset, offset, offset + inner, offset + inner), inner * 0.25, EMERALD)

    font = ImageFont.truetype(FONT_PATH, int(inner * 0.62))
    draw.text((size / 2, size / 2 + inner * 0.06), "C", font=font, fill=GLYPH, anchor="mm")
    return img


def draw_full_bleed(size, maskable=False):
    """Icono a sangre completa: fondo negro total (maskable / apple-touch)."""
    img = Image.new("RGBA", (size, size), BLACK)
    draw = ImageDraw.Draw(img)

    inner = size * (0.52 if maskable else 0.62)
    offset = (size - inner) / 2
    rounded_rect(draw, (offset, offset, offset + inner, offset + inner), inner * 0.25, EMERALD)

    font = ImageFont.truetype(FONT_PATH, int(inner * 0.62))
    draw.text((size / 2, size / 2 + inner * 0.06), "C", font=font, fill=GLYPH, anchor="mm")
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    draw_glyph(192).save(OUT / "icon-192.png")
    draw_glyph(512).save(OUT / "icon-512.png")
    draw_full_bleed(512, maskable=True).save(OUT / "maskable-512.png")
    draw_full_bleed(192, maskable=True).save(OUT / "maskable-192.png")
    draw_full_bleed(180).save(APPLE_OUT)

    print("Iconos generados en", OUT, "y", APPLE_OUT)


if __name__ == "__main__":
    main()
