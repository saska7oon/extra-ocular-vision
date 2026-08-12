#!/usr/bin/env python3
"""Generate PWA icons in multiple sizes from a single SVG source."""
import os

# Resolve path relative to the project root (two levels up from this script)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ICON_DIR = os.path.join(PROJECT_ROOT, 'public', 'icons')
os.makedirs(ICON_DIR, exist_ok=True)

def make_svg(size):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#0d1117"/>
  <circle cx="50" cy="35" r="12" fill="#60a5fa"/>
  <path d="M30 55 Q50 75 70 55" stroke="#e3e3f2" stroke-width="3" fill="none" stroke-linecap="round"/>
  <rect x="25" y="60" width="50" height="14" rx="7" fill="#60a5fa"/>
</svg>
'''

sizes = [72, 96, 128, 144, 152, 192, 384, 512]
for s in sizes:
    with open(os.path.join(ICON_DIR, f'icon-{s}.svg'), 'w') as f:
        f.write(make_svg(s))

with open(os.path.join(PROJECT_ROOT, 'public', 'favicon.svg'), 'w') as f:
    f.write(make_svg(64))

print(f"Created {len(sizes)} SVG icons + favicon.svg in {ICON_DIR}")
