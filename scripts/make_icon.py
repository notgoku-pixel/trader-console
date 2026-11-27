"""Generate the desktop icon: neon hexagon with rising candlesticks.

Run: python scripts/make_icon.py
Output: assets/trader-console.ico
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "trader-console.ico"
S = 1024  # supersample canvas


def hex_points(cx, cy, r):
    # pointy-top hexagon
    return [(cx + r * math.cos(math.radians(90 + 60 * i)),
             cy + r * math.sin(math.radians(90 + 60 * i))) for i in range(6)]


def build():
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    # Soft neon glow behind the hexagon.
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.polygon(hex_points(S / 2, S / 2, 420), fill=(90, 60, 255, 210))
    gd.polygon(hex_points(S / 2, S / 2, 380), fill=(40, 150, 255, 170))
    glow = glow.filter(ImageFilter.GaussianBlur(85))
    img.alpha_composite(glow)

    d = ImageDraw.Draw(img)
    # Hexagon body with a subtle vertical gradient.
    body = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    bd = ImageDraw.Draw(body)
    for y in range(S):
        t = y / S
        color = (int(14 + 8 * t), int(17 + 10 * t), int(34 + 22 * t), 255)
        bd.line([(0, y), (S, y)], fill=color)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).polygon(hex_points(S / 2, S / 2, 392), fill=255)
    img.paste(body, (0, 0), mask)
    d = ImageDraw.Draw(img)
    d.line(hex_points(S / 2, S / 2, 392) + [hex_points(S / 2, S / 2, 392)[0]],
           fill=(140, 110, 255, 255), width=16, joint="curve")

    # Rising candlesticks.
    candles = [
        (300, 690, 560, 760, 610, (77, 226, 255)),
        (512, 545, 430, 620, 490, (124, 120, 255)),
        (724, 390, 285, 470, 235, (92, 224, 160)),
    ]
    for x, cy, top, bottom, wick_top, color in candles:
        w = 74
        d.line([(x, wick_top), (x, bottom + 42)], fill=color + (255,), width=14)
        d.rounded_rectangle([x - w // 2, top, x + w // 2, bottom], radius=12,
                            fill=color + (255,))
        d.line([(x - w // 2 + 8, top + 8), (x + w // 2 - 8, top + 8)],
               fill=(255, 255, 255, 110), width=6)

    # Trend line and arrow head.
    d.line([(262, 700), (500, 545), (724, 350)], fill=(235, 245, 255, 255), width=18, joint="curve")
    d.polygon([(790, 300), (735, 385), (825, 372)], fill=(235, 245, 255, 255))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.resize((256, 256), Image.Resampling.LANCZOS).save(
        OUT, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    )
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
