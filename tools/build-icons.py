#!/usr/bin/env python3
"""Generates the Void's Archive logo SVGs into deploy/public/icons/.
The mark: a gold ring (the Void) broken at the top, a four-pointed star (the
Witness) standing in the Gap, and the empty centre. PNGs are rendered from these
SVGs by tools/render-icons.mjs."""
import math, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'deploy', 'public', 'icons')
C = 256

def star(cx, cy, R, w, a):
    return (f"M{cx} {cy-R} Q{cx+a} {cy-a} {cx+w} {cy} Q{cx+a} {cy+a} {cx} {cy+R} "
            f"Q{cx-a} {cy+a} {cx-w} {cy} Q{cx-a} {cy-a} {cx} {cy-R}Z")

ANGLE = 40  # where the Gap sits, degrees clockwise from the top

def pt(r, deg):
    t = math.radians(deg)
    return C + r*math.sin(t), C - r*math.cos(t)

def arc(r, gap_deg):
    x1, y1 = pt(r, ANGLE + gap_deg/2)
    x2, y2 = pt(r, ANGLE - gap_deg/2)
    return f"M{x1:.2f} {y1:.2f} A{r} {r} 0 1 1 {x2:.2f} {y2:.2f}"

def mark(r=150, stroke=10, gap=26, sR=50, sW=31, sA=5, inner=True, glow=True,
         ring='url(#gold)', fill='url(#star)'):
    sx, sy = pt(r, ANGLE)
    sx, sy = round(sx, 2), round(sy, 2)
    parts = []
    if inner:
        parts.append(f'<circle cx="{C}" cy="{C}" r="{r-42}" fill="none" stroke="{ring}" stroke-width="1.6" opacity=".34"/>')
        parts.append(f'<circle cx="{C}" cy="{C}" r="{r-80}" fill="none" stroke="{ring}" stroke-width="1.2" opacity=".18"/>')
    parts.append(f'<path d="{arc(r, gap)}" fill="none" stroke="{ring}" stroke-width="{stroke}" stroke-linecap="round"/>')
    if glow:
        parts.append(f'<circle cx="{sx}" cy="{sy}" r="{sR*1.5:.0f}" fill="url(#glow)"/>')
    parts.append(f'<path d="{star(sx, sy, sR, sW, sA)}" fill="{fill}"/>')
    return "\n  ".join(parts)

DEFS = '''<defs>
    <radialGradient id="bg" cx="50%" cy="44%" r="70%">
      <stop offset="0" stop-color="#26222c"/><stop offset=".6" stop-color="#141318"/><stop offset="1" stop-color="#0b0b0e"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f3d9a4"/><stop offset=".55" stop-color="#d2a468"/><stop offset="1" stop-color="#9c6b35"/>
    </linearGradient>
    <linearGradient id="star" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff4dc"/><stop offset="1" stop-color="#e6bd7f"/>
    </linearGradient>
    <radialGradient id="glow">
      <stop offset="0" stop-color="#f3d9a4" stop-opacity=".55"/><stop offset=".45" stop-color="#d2a468" stop-opacity=".16"/><stop offset="1" stop-color="#d2a468" stop-opacity="0"/>
    </radialGradient>
  </defs>'''

def svg(body, bg_rx=None, full=False):
    bg = ''
    if full: bg = '<rect width="512" height="512" fill="url(#bg)"/>'
    elif bg_rx is not None: bg = f'<rect width="512" height="512" rx="{bg_rx}" fill="url(#bg)"/>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">\n  {DEFS}\n  {bg}\n  {body}\n</svg>\n')

files = {
    # app icon (rounded square) and maskable (full bleed, mark inside the 80% safe zone)
    'icon.svg': svg(mark(), bg_rx=112),
    'icon-maskable.svg': svg(mark(r=132, stroke=9, sR=44, sW=27), full=True),
    # favicon: heavier strokes, no faint rings, so it reads at 16–32px
    'favicon.svg': svg(mark(r=150, stroke=36, gap=44, sR=100, sW=60, sA=10, inner=False, glow=False), bg_rx=120),
    # single-colour mark for the cover page and README; takes the theme accent via currentColor
    'mark.svg': svg(mark(stroke=12, sR=54, sW=34, glow=False, ring='currentColor', fill='currentColor')).replace(DEFS, ''),
}
os.makedirs(OUT, exist_ok=True)
for name, s in files.items():
    open(os.path.join(OUT, name), 'w').write(s)
    print('wrote icons/' + name)
