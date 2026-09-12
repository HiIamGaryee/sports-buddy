"""Generate Capacitor icon + splash source images from src/assets/logo.png.

Run after replacing the logo:  python3 scripts/make-app-assets.py
Then:                          npm run cap:assets
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / 'src/assets/logo.png'
OUT = ROOT / 'resources'

DARK = '#0b0c10'   # --background (.dark)
LIGHT = '#f6f7f8'  # --background (:root)

# name -> (canvas size, background, logo width as a fraction of the canvas)
TARGETS = {
    'icon-only.png': (1024, DARK, 0.78),
    'icon-foreground.png': (1024, None, 0.78),  # adaptive: @capacitor/assets insets this 16.7%
    'icon-background.png': (1024, DARK, 0.0),
    'splash.png': (2732, LIGHT, 0.30),
    'splash-dark.png': (2732, DARK, 0.30),
}


def render(logo: Image.Image, size: int, background: str | None, scale: float) -> Image.Image:
    canvas = Image.new('RGBA', (size, size), background or (0, 0, 0, 0))
    if scale:
        width = round(size * scale)
        height = round(width * logo.height / logo.width)
        mark = logo.resize((width, height), Image.LANCZOS)
        canvas.alpha_composite(mark, ((size - width) // 2, (size - height) // 2))
    return canvas


def main() -> None:
    logo = Image.open(LOGO).convert('RGBA')
    OUT.mkdir(exist_ok=True)
    for name, (size, background, scale) in TARGETS.items():
        render(logo, size, background, scale).save(OUT / name)
        print(f'{name} {size}x{size}')


if __name__ == '__main__':
    main()
