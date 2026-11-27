"""
Kuleana asset builder.

Slices the source art in docs/ into game-ready 32px-grid pixel art:
  - ground textures (made seamless so they tile without visible seams)
  - sprites with the dark / sand backgrounds keyed out
Then writes assets/*.png (for inspection) and js/assets_data.js
(base64 data URLs, so the game runs by just opening index.html).

Run:  python3 tools/build_assets.py
"""
import base64, io, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")
OUT = os.path.join(ROOT, "assets")
os.makedirs(OUT, exist_ok=True)

def load(fn):
    return np.array(Image.open(os.path.join(DOCS, fn)).convert("RGBA")).astype(np.int32)

TILES = load("hawaiian_outside_tileset.png.png")
FLORA = load("flora_outside_decor.png")
TREES = load("Trees_outside_decor.png")
SOLAR = load("Solar_tileset.png")
SOLAR2 = load("Solar_tileset_2.png")

# cell boxes of the 4x3 Hawaiian tile sheet (measured from the dark gutters)
COLS = [(18, 295), (314, 591), (609, 886), (905, 1182)]
ROWS = [(16, 291), (309, 588), (606, 880)]

def cell(r, c, inset=3):
    (x0, x1), (y0, y1) = COLS[c], ROWS[r]
    return TILES[y0 + inset:y1 - inset, x0 + inset:x1 - inset].copy()

# ---------------------------------------------------------------- keying
def key_dark(a, thr=40):
    a = a.copy()
    dark = a[..., :3].max(axis=2) < thr
    a[dark, 3] = 0
    return a

def is_sand(px):
    r, g, b = px[..., 0], px[..., 1], px[..., 2]
    return (r > 170) & (g > 120) & (b < 150) & (r - b > 70) & (r >= g)

def key_flood(a, pred):
    """Remove pixels matching pred that are connected to the image border."""
    a = a.copy()
    h, w = a.shape[:2]
    m = pred(a) | (a[..., 3] == 0)
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if m[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if m[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    a[seen, 3] = 0
    return a

def keep_component(a, seeds):
    """Keep only opaque pixels 8-connected to any of the seed points (y, x)."""
    h, w = a.shape[:2]
    op = a[..., 3] > 0
    keep = np.zeros((h, w), bool)
    q = deque()
    for sy, sx in seeds:
        # snap seed to nearest opaque pixel
        best = None
        for r in range(0, 20):
            ys, xs = np.nonzero(op[max(0, sy - r):sy + r + 1, max(0, sx - r):sx + r + 1])
            if len(ys):
                best = (ys[0] + max(0, sy - r), xs[0] + max(0, sx - r)); break
        if best and not keep[best]:
            keep[best] = True; q.append(best)
    while q:
        y, x = q.popleft()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and op[ny, nx] and not keep[ny, nx]:
                    keep[ny, nx] = True; q.append((ny, nx))
    a = a.copy()
    a[~keep, 3] = 0
    return a

# ---------------------------------------------------------------- resampling
def downsample(a, size):
    """Alpha-aware area downsample to (w, h), then hard alpha."""
    im = Image.fromarray(a.astype(np.uint8)).convert("RGBa")
    im = im.resize(size, Image.BOX).convert("RGBA")
    out = np.array(im).astype(np.int32)
    out[..., 3] = np.where(out[..., 3] >= 110, 255, 0)
    return out

def quantize(a, colors=32, palette_src=None):
    """Snap colours to a small palette so the downsample reads as crisp pixel art."""
    rgb = Image.fromarray(a[..., :3].astype(np.uint8))
    if palette_src is None:
        q = rgb.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE)
    else:
        q = rgb.quantize(palette=palette_src, dither=Image.NONE)
    out = a.copy()
    out[..., :3] = np.array(q.convert("RGB")).astype(np.int32)
    return out, q

def outline(a, color=(12, 34, 24), sides="all"):
    """1px outline around opaque area (drawn into transparent neighbours)."""
    op = a[..., 3] > 0
    n = np.zeros_like(op)
    n[1:, :] |= op[:-1, :]
    n[:-1, :] |= op[1:, :]
    n[:, 1:] |= op[:, :-1]
    n[:, :-1] |= op[:, 1:]
    edge = n & ~op
    a = a.copy()
    a[edge, 0], a[edge, 1], a[edge, 2], a[edge, 3] = color[0], color[1], color[2], 255
    return a

def pad(a, p=1):
    return np.pad(a, ((p, p), (p, p), (0, 0)))

def trim(a):
    ys, xs = np.nonzero(a[..., 3])
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

# ---------------------------------------------------------------- crisp downsampling
def palette_of(a, colors):
    """Median-cut palette built from the opaque pixels only."""
    op = a[..., 3] > 0
    px = a[op][:, :3].astype(np.uint8)
    if len(px) == 0:
        return np.zeros((1, 3), np.int32)
    q = Image.fromarray(px[None]).quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE)
    n = len(set(np.array(q).ravel().tolist()))
    return np.array(q.getpalette()[:3 * max(n, 1)]).reshape(-1, 3).astype(np.int32)

def snap(a, pal):
    """Map every pixel to its nearest palette colour."""
    flat = a[..., :3].reshape(-1, 3).astype(np.int32)
    best = np.zeros(len(flat), np.int32); bd = np.full(len(flat), 1 << 30)
    for k, c in enumerate(pal):
        d = ((flat - c) ** 2).sum(1)
        m = d < bd; bd[m] = d[m]; best[m] = k
    out = a.copy()
    out[..., :3] = pal[best].reshape(a.shape[0], a.shape[1], 3)
    return out, best.reshape(a.shape[:2])

def crisp(a, size, colors, sharpen=True):
    """Downscale by majority vote of palette colours: no blended in-between colours, so the
    result reads as clean, sharp pixel art instead of a blurry thumbnail."""
    a = a.copy()
    if sharpen:
        rgb = Image.fromarray(a[..., :3].astype(np.uint8)).filter(ImageFilter.UnsharpMask(radius=2, percent=80, threshold=3))
        a[..., :3] = np.array(rgb).astype(np.int32)
    pal = palette_of(a, colors)
    _, idx = snap(a, pal)
    h, w = a.shape[:2]; tw, th = size
    op = a[..., 3] > 0
    n = len(pal)
    lab = np.where(op, idx, n)
    cy = np.minimum((np.arange(h) * th) // h, th - 1)
    cx = np.minimum((np.arange(w) * tw) // w, tw - 1)
    cell = cy[:, None] * tw + cx[None, :]
    counts = np.bincount((cell * (n + 1) + lab).ravel(), minlength=tw * th * (n + 1)).reshape(th * tw, n + 1)
    tot = counts.sum(1)
    best = counts[:, :n].argmax(1)
    out = np.zeros((th, tw, 4), np.int32)
    out[..., :3] = pal[best].reshape(th, tw, 3)
    out[..., 3] = np.where(counts[:, n] < tot * 0.5, 255, 0).reshape(th, tw)
    return out

# ---------------------------------------------------------------- seamless
def seamless(a):
    """4-way offset blend: every source seam is multiplied by a zero weight."""
    h, w = a.shape[:2]
    f = a[..., :3].astype(np.float64)
    def win(n):
        t = np.arange(n) + 0.5
        d = np.minimum(t, n - t) / (n * 0.5)          # 0 at edges, 1 at centre
        x = np.clip(d / 0.55, 0, 1)
        return x * x * (3 - 2 * x)
    ax, ay = win(w)[None, :], win(h)[:, None]
    T = f
    X = np.roll(f, w // 2, axis=1)
    Y = np.roll(f, h // 2, axis=0)
    XY = np.roll(X, h // 2, axis=0)
    wT = (ax * ay)[..., None]
    wX = ((1 - ax) * ay)[..., None]
    wY = (ax * (1 - ay))[..., None]
    wXY = ((1 - ax) * (1 - ay))[..., None]
    out = T * wT + X * wX + Y * wY + XY * wXY
    res = a.copy()
    res[..., :3] = np.clip(out, 0, 255).astype(np.int32)
    return res

def texture(src, size, colors=24):
    src = src.copy(); src[..., 3] = 255
    d = crisp(src, size, colors)
    pal = palette_of(d, 64)
    s = seamless(d)
    s, _ = snap(s, pal)
    s[..., 3] = 255
    return s

def sprite(src, factor=None, size=None, colors=40, line=(12, 34, 24), do_outline=True):
    src = trim(src)
    h, w = src.shape[:2]
    if size is None:
        size = (max(1, round(w / factor)), max(1, round(h / factor)))
    d = crisp(src, size, colors)
    d = trim(d)
    if do_outline:
        d = outline(pad(d), line)
    return d


# ---------------------------------------------------------------- cleanup
def vnoise(n, seed, scale):
    """1-D smooth noise of length n in 0..1."""
    rng = np.random.RandomState(seed)
    k = max(2, int(n / scale) + 2)
    pts = rng.rand(k)
    xs = np.arange(n) / scale
    i = np.floor(xs).astype(int); f = xs - i
    f = f * f * (3 - 2 * f)
    return pts[i] * (1 - f) + pts[i + 1] * f

def ragged(a, sides="tlrb", depth=8, seed=1):
    """Tear straight crop edges into leafy, irregular ones."""
    a = a.copy(); h, w = a.shape[:2]
    if "t" in sides:
        d = (2 + vnoise(w, seed, 5) * depth).astype(int)
        for x in range(w): a[:d[x], x, 3] = 0
    if "b" in sides:
        d = (2 + vnoise(w, seed + 1, 5) * depth).astype(int)
        for x in range(w): a[h - d[x]:, x, 3] = 0
    if "l" in sides:
        d = (2 + vnoise(h, seed + 2, 5) * depth).astype(int)
        for y in range(h): a[y, :d[y], 3] = 0
    if "r" in sides:
        d = (2 + vnoise(h, seed + 3, 5) * depth).astype(int)
        for y in range(h): a[y, w - d[y]:, 3] = 0
    return a

def round_mask(a, power=2.0, seed=4, wobble=0.18):
    a = a.copy(); h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    dx = (xx - (w - 1) / 2) / (w / 2); dy = (yy - (h - 1) / 2) / (h / 2)
    ang = np.arctan2(dy, dx)
    rng = np.random.RandomState(seed); ph = rng.rand(3) * 6
    lim = 1 + wobble * (np.sin(ang * 5 + ph[0]) * 0.5 + np.sin(ang * 9 + ph[1]) * 0.3 + np.sin(ang * 13 + ph[2]) * 0.2)
    r = (np.abs(dx) ** power + np.abs(dy) ** power) ** (1 / power)
    a[r > lim, 3] = 0
    return a

def erase(a, rects):
    a = a.copy()
    for x0, y0, x1, y1 in rects: a[y0:y1 + 1, x0:x1 + 1, 3] = 0
    return a

def largest_parts(a, min_size=14):
    """Drop little islands left over from cropping."""
    h, w = a.shape[:2]
    op = a[..., 3] > 0
    lab = np.zeros((h, w), np.int32); n = 0; sizes = [0]
    for sy in range(h):
        for sx in range(w):
            if op[sy, sx] and not lab[sy, sx]:
                n += 1; q = deque([(sy, sx)]); lab[sy, sx] = n; c = 0
                while q:
                    y, x = q.popleft(); c += 1
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = y + dy, x + dx
                            if 0 <= ny < h and 0 <= nx < w and op[ny, nx] and not lab[ny, nx]:
                                lab[ny, nx] = n; q.append((ny, nx))
                sizes.append(c)
    big = max(sizes)
    a = a.copy()
    for k in range(1, n + 1):
        if sizes[k] < max(min_size, big * 0.02): a[lab == k, 3] = 0
    return a

def finish(a, line, post=None):
    """sprite without outline -> post-process -> trim -> outline"""
    if post: a = post(a)
    a = largest_parts(a)
    a = trim(a)
    return outline(pad(a), line)

def period(arr, axis, lo, hi):
    lum = arr[..., :3].mean(axis=2).mean(axis=axis)
    lum = lum - lum.mean()
    best, bp = -1e9, lo
    for p in range(lo, min(hi, len(lum) // 2)):
        c = (lum[:-p] * lum[p:]).mean()
        if c > best: best, bp = c, p
    return bp

# ---------------------------------------------------------------- build
assets = {}

def put(name, a):
    im = Image.fromarray(a.astype(np.uint8))
    im.save(os.path.join(OUT, name + ".png"))
    buf = io.BytesIO(); im.save(buf, "PNG", optimize=True)
    assets[name] = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    print(f"  {name:18s} {a.shape[1]}x{a.shape[0]}")

# ---------------------------------------------------------------- rotsprite
def pack(a):
    a = a.astype(np.uint32)
    p = a[..., 0] | (a[..., 1] << 8) | (a[..., 2] << 16) | (a[..., 3] << 24)
    p[a[..., 3] == 0] = 0
    return p

def unpack(p):
    return np.stack([p & 255, (p >> 8) & 255, (p >> 16) & 255, (p >> 24) & 255], -1).astype(np.int32)

def scale2x(p):
    h, w = p.shape
    P = np.pad(p, 1, mode="edge")
    A = P[0:h, 1:w + 1]; B = P[1:h + 1, 2:w + 2]; C = P[1:h + 1, 0:w]; D = P[2:h + 2, 1:w + 1]
    out = np.zeros((h * 2, w * 2), np.uint32)
    out[0::2, 0::2] = np.where((C == A) & (C != D) & (A != B), A, p)
    out[0::2, 1::2] = np.where((A == B) & (A != C) & (B != D), B, p)
    out[1::2, 0::2] = np.where((D == C) & (D != B) & (C != A), C, p)
    out[1::2, 1::2] = np.where((B == D) & (B != A) & (D != C), D, p)
    return out

def rot_frames(a, pivot, angles, pad):
    """RotSprite: upscale 8x with Scale2x, rotate (nearest), sample back down.
    Returns a horizontal strip of frames, each (w+2pad) x (h+2pad); pivot moves by +pad."""
    big = scale2x(scale2x(scale2x(pack(a))))
    h, w = a.shape[:2]
    fw, fh = w + 2 * pad, h + 2 * pad
    opx, opy = pivot[0] + pad, pivot[1] + pad
    yy, xx = np.mgrid[0:fh, 0:fw]
    vx = xx + 0.5 - opx; vy = yy + 0.5 - opy
    frames = []
    for ang in angles:
        t = np.radians(ang); c, s_ = np.cos(t), np.sin(t)
        sx = (c * vx + s_ * vy + pivot[0]) * 8; sy = (-s_ * vx + c * vy + pivot[1]) * 8
        bx = np.floor(sx).astype(int); by = np.floor(sy).astype(int)
        ok = (bx >= 0) & (by >= 0) & (bx < w * 8) & (by < h * 8)
        f = np.zeros((fh, fw), np.uint32)
        f[ok] = big[by[ok], bx[ok]]
        frames.append(unpack(f))
    return np.concatenate(frames, axis=1), (fw, fh)

def crown_pivot(a):
    """Where the trunk meets the crown: under the centre of the coconut cluster. Any thin
    trunk stub hanging below the coconuts is removed from the art (in place) first, so the
    separate trunk always meets the crown in the same spot."""
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    brown = (al > 0) & (r > g) & (r > 60) & (r - b > 25)
    rows = [y for y in range(a.shape[0]) if brown[y].any()]
    while rows:
        y = rows[-1]; xs = np.nonzero(brown[y])[0]
        if xs.max() - xs.min() > 5: break
        for x in range(max(0, xs.min() - 1), min(a.shape[1], xs.max() + 2)):
            if a[y, x, 1] <= a[y, x, 0] + 8: a[y, x, 3] = 0; a[y, x, :3] = 0
        brown[y] = False; rows.pop()
    ys, xs = np.nonzero(brown)
    if len(ys) == 0:
        return a.shape[1] // 2, int(a.shape[0] * 0.6)
    yb = ys.max()
    sel = ys >= yb - 3
    return int(round(np.median(xs[sel]))), int(yb)

meta = {}

print("ground textures (one source tile = one 32x32 game tile)")
put("tex_water", texture(cell(0, 0, 6), (32, 32), 12))
put("tex_sand", texture(cell(0, 2, 6), (32, 32), 12))
put("tex_sand_shells", texture(cell(0, 3, 6), (32, 32), 20))
# grass: the plain blades from the grass/sand edge tile (the full grass tile's little bush
# motifs repeat as a dotted grid at this size)
put("tex_grass", texture(cell(1, 1, 0)[4:116, 4:116].copy(), (32, 32), 10))
rock = cell(2, 3, 4)[0:205, 0:205]
put("tex_rock", texture(rock, (32, 32), 12))

# carved stone road: the 3x3 slab tile becomes one 2x2-tile (64px) block
g0 = cell(2, 2, 2); g0[..., 3] = 255
glyph = crisp(g0, (64, 64), 16)
put("tex_glyph", glyph)

# solar mosaic floor + medallion
sol2 = SOLAR2[9:404, 3:476]
px_ = period(sol2, 0, 110, 170); py_ = period(sol2, 1, 110, 170)
f0 = sol2[4:4 + py_, 4:4 + px_].copy(); f0[..., 3] = 255
floor = crisp(f0, (32, 32), 10)
put("tex_solar", floor)
m0 = SOLAR.copy(); m0[..., 3] = 255
med = crisp(m0, (96, 72), 12)
put("solar_medallion", med)

print("tiles as sprites")
bridge_h = key_dark(TILES[ROWS[1][0]:ROWS[1][1], COLS[2][0]:COLS[2][1]], 45)
put("bridge_h", sprite(bridge_h, 4.33, colors=20, line=(36, 22, 14)))
bridge_v = key_dark(TILES[ROWS[1][0]:ROWS[1][1], COLS[3][0]:COLS[3][1]], 45)
put("bridge_v", sprite(bridge_v, 4.33, colors=20, line=(36, 22, 14)))

# ---------------------------------------------------------------- repaint + wind frames (palms, taro, bushes)
# Same silhouette and the same light/dark structure as the original sprite, but every pixel is
# repainted from a small hand-picked ramp per material (cool shadows -> warm highlights), stray
# single pixels are cleaned up, the edge facing the sun gets a highlight and outlines are shades
# of the material they wrap (no flat black line).
RAMP = {
    "palm":  [(16, 50, 44), (26, 82, 52), (40, 116, 58), (66, 150, 62), (108, 184, 70), (166, 214, 96)],
    "taro":  [(14, 46, 46), (22, 74, 60), (34, 104, 72), (54, 138, 82), (90, 172, 100), (146, 206, 128)],
    "bush":  [(14, 48, 42), (24, 78, 52), (38, 110, 60), (60, 144, 66), (100, 178, 78), (156, 210, 104)],
    "brown": [(44, 26, 28), (80, 46, 36), (118, 72, 46), (158, 104, 62), (194, 140, 86)],
    "red":   [(112, 18, 38), (170, 30, 46), (216, 58, 58), (246, 118, 96)],
    "white": [(196, 190, 176), (234, 230, 212), (255, 252, 240)],
    "yellow": [(206, 140, 40), (246, 196, 70), (255, 234, 140)],
}
CLASS_RAMP = ["green", "brown", "red", "white", "yellow"]

def _shift(arr, dy, dx, fill=0):
    """value of arr at (y+dy, x+dx) for every (y, x)"""
    h, w = arr.shape[:2]
    padw = [(1, 1), (1, 1)] + [(0, 0)] * (arr.ndim - 2)
    P = np.pad(arr, padw, constant_values=fill)
    return P[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]

def classify(a):
    r, g, b = a[..., 0].astype(np.float64), a[..., 1].astype(np.float64), a[..., 2].astype(np.float64)
    L = r * 0.3 + g * 0.59 + b * 0.11
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    cls = np.zeros(r.shape, np.int32)
    red = (r > 140) & (r > g * 1.6) & (r > b * 1.4)
    white = (r > 185) & (g > 180) & (b > 140) & (mx - mn < 110)
    yellow = (r > 180) & (g > 130) & (b <= 140) & (r >= g * 0.9) & ~red
    brown = (r >= g) & (r - b > 15) & (L < 165) & ~red & ~white & ~yellow
    cls[brown] = 1; cls[red] = 2; cls[white] = 3; cls[yellow] = 4
    cls[a[..., 3] == 0] = -1
    return cls, L

def _alpha_op(alpha, fn):
    t = np.zeros(alpha.shape + (4,), np.int32); t[..., 3] = np.where(alpha, 255, 0); t[..., :3] = 100
    return fn(t)[..., 3] > 0

def repaint(src, factor, green, mask=None):
    src = trim(src)
    h, w = src.shape[:2]
    tw, th = max(1, round(w / factor)), max(1, round(h / factor))
    cls, L = classify(src)
    # soften the source noise a little before sampling its brightness
    Lp = np.pad(L, 1, mode="edge")
    Lb = sum(Lp[1 + dy:1 + dy + h, 1 + dx:1 + dx + w] for dy in (-1, 0, 1) for dx in (-1, 0, 1)) / 9.0
    cy = np.minimum((np.arange(h) * th) // h, th - 1); cx = np.minimum((np.arange(w) * tw) // w, tw - 1)
    cell = cy[:, None] * tw + cx[None, :]
    counts = np.bincount((cell * 6 + cls + 1).ravel(), minlength=tw * th * 6).reshape(-1, 6)
    alpha = (counts[:, 0] < counts.sum(1) * 0.5).reshape(th, tw)
    C = counts[:, 1:].argmax(1)
    sel = cls >= 0
    key = (cell * 5 + np.maximum(cls, 0))[sel]
    sumL = np.bincount(key, weights=Lb[sel], minlength=tw * th * 5)
    cnt = np.bincount(key, minlength=tw * th * 5)
    idx = np.arange(tw * th) * 5 + C
    meanL = (sumL[idx] / np.maximum(cnt[idx], 1)).reshape(th, tw)
    C = C.reshape(th, tw)
    if mask: alpha = _alpha_op(alpha, mask)
    alpha = _alpha_op(alpha, largest_parts)
    ramps = [green] + [RAMP[k] for k in CLASS_RAMP[1:]]
    lev = np.zeros((th, tw), np.int32)
    for c in range(5):
        m = alpha & (C == c)
        if not m.any(): continue
        p5, p95 = np.percentile(meanL[m], [6, 94])
        t = np.clip((meanL - p5) / max(1e-6, p95 - p5), 0, 1) ** 0.92
        n = len(ramps[c])
        lev[m] = np.clip(np.round(t[m] * (n - 1)), 0, n - 1)
    # clean up orphan pixels (a level no neighbour shares)
    for _ in range(2):
        nb = [(_shift(lev, dy, dx), _shift(C, dy, dx, -1), _shift(alpha, dy, dx)) for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1))]
        same = sum(((nl == lev) & (nc == C) & na).astype(int) for nl, nc, na in nb)
        orphan = alpha & (same == 0)
        if not orphan.any(): break
        acc = sum((nl * ((nc == C) & na)).astype(float) for nl, nc, na in nb)
        num = sum(((nc == C) & na).astype(float) for nl, nc, na in nb)
        lev = np.where(orphan & (num > 0), np.round(acc / np.maximum(num, 1)).astype(np.int32), lev)
    return {"C": C, "lev": lev, "alpha": alpha, "ramps": ramps}

def render(P, lev=None, outline_on=True):
    """level map -> RGBA with sun-side rim, far-side shade and sel-out outline (padded 1px)."""
    C = np.pad(P["C"], 1); A = np.pad(P["alpha"], 1); lv = np.pad(P["lev"] if lev is None else lev, 1)
    ramps = P["ramps"]
    up, left, ul = _shift(A, -1, 0), _shift(A, 0, -1), _shift(A, -1, -1)
    down, right = _shift(A, 1, 0), _shift(A, 0, 1)
    lit = A & (~up | ~left | ~ul)
    shd = A & (~down | ~right) & ~lit
    cast = A & ul & (_shift(lv, -1, -1) - lv >= 2) & (_shift(C, -1, -1) == C)
    L2 = lv + lit.astype(int) - shd.astype(int) - cast.astype(int)
    out = np.zeros(A.shape + (4,), np.int32)
    for c in range(5):
        rp = np.array(ramps[c])
        m = A & (C == c)
        out[m, :3] = rp[np.clip(L2[m], 0, len(rp) - 1)]
    out[A, 3] = 255
    if outline_on:
        for dy, dx, k in [(1, 0, 1), (0, 1, 1), (-1, 0, 0), (0, -1, 0)]:  # top/left outline lighter, bottom/right darkest
            m = ~A & _shift(A, dy, dx) & (out[..., 3] == 0)
            nc = _shift(C, dy, dx)
            for c in range(5):
                mm = m & (nc == c)
                out[mm, :3] = ramps[c][k] if c == 0 or c == 1 else ramps[1][0]
                out[mm, 3] = 255
    return out

WIND_LEVELS = [-0.25, 0, 0.2, 0.4, 0.6, 0.8, 1.0]
WIND_FLUTTER = 4
def _vnoise(shape, cell, seed):
    rng = np.random.RandomState(seed)
    gh, gw = shape[0] // cell + 2, shape[1] // cell + 2
    g = rng.rand(gh, gw)
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]] / float(cell)
    i, j = yy.astype(int), xx.astype(int); fy, fx = yy - i, xx - j
    fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
    return g[i, j] * (1 - fx) * (1 - fy) + g[i, j + 1] * fx * (1 - fy) + g[i + 1, j] * (1 - fx) * fy + g[i + 1, j + 1] * fx * fy

def richen(a):
    """Keep the original texture but give it depth: lit greens lean warm, shaded greens lean
    cool, and fine bright detail (leaf veins, leaflet edges) is lifted so leaves read as leaves."""
    a = a.copy()
    rgb = a[..., :3].astype(np.float64); op = a[..., 3] > 0
    L = rgb[..., 0] * 0.3 + rgb[..., 1] * 0.59 + rgb[..., 2] * 0.11
    green = op & (rgb[..., 1] >= rgb[..., 0]) & (rgb[..., 1] >= rgb[..., 2] * 0.9)
    if green.sum() > 10:
        lo, hi = np.percentile(L[green], [5, 95])
        t = np.clip((L - lo) / max(1, hi - lo), 0, 1)
        warm, cool = np.array([250, 236, 120.0]), np.array([16, 56, 84.0])
        g = rgb[green]
        g = g + (warm - g) * (0.1 * t[green])[:, None]
        g = g + (cool - g) * (0.1 * (1 - t[green]))[:, None]
        rgb[green] = g
        # lift veins: brighter than the 4-neighbour average
        Lp = np.pad(L, 1, mode="edge")
        nb = (Lp[:-2, 1:-1] + Lp[2:, 1:-1] + Lp[1:-1, :-2] + Lp[1:-1, 2:]) / 4
        vein = green & (L - nb > 14) & (t > 0.2) & (t < 0.85)
        rgb[vein] = np.minimum(255, rgb[vein] * 1.07 + 4)
    a[..., :3] = np.clip(rgb, 0, 255).astype(np.int32)
    return a

def finish_detail(a):
    """sun-side rim + sel-out outline (outline is a dark tint of the colour it wraps)."""
    a = pad(trim(a), 1).astype(np.float64)
    op = a[..., 3] > 0
    rgb = a[..., :3]
    out = rgb.copy()
    acc = np.zeros_like(rgb); cnt = np.zeros(op.shape)
    for dy, dx, f in [(-1, 0, 0.42), (0, -1, 0.46), (1, 0, 0.6), (0, 1, 0.56)]:
        m = ~op & _shift(op, dy, dx)
        acc[m] += _shift(rgb, dy, dx)[m] * f; cnt[m] += 1
    m = cnt > 0
    ol = acc[m] / cnt[m][:, None]; ol[:, 0] *= 0.85; ol[:, 2] = ol[:, 2] * 1.1 + 6
    out[m] = ol
    res = np.zeros(a.shape, np.int32)
    res[..., :3] = np.clip(out, 0, 255).astype(np.int32)
    res[..., 3] = np.where(op | m, 255, 0)
    return res

def plumeria_flower(rot):
    """A frangipani bloom: five rounded petals in a pinwheel, cream-white with a soft yellow throat."""
    S = 8; n = 7
    yy, xx = np.mgrid[0:n * S, 0:n * S]
    px, py = (xx + 0.5) / S - n / 2, (yy + 0.5) / S - n / 2
    lab = np.full((n * S, n * S), -1)
    for k in range(5):
        ang = rot + k * 2 * np.pi / 5
        cx, cy = np.cos(ang) * 1.55, np.sin(ang) * 1.55
        sk = ang + 0.45
        u = (px - cx) * np.cos(sk) + (py - cy) * np.sin(sk)
        v = -(px - cx) * np.sin(sk) + (py - cy) * np.cos(sk)
        inside = (u / 1.85) ** 2 + (v / 1.2) ** 2 <= 1
        facing = (np.cos(ang) * -0.7 + np.sin(ang) * -0.7) > -0.2
        lab[inside] = np.where(v[inside] > 0.75, 2, 0 if facing else 1)   # trailing edge shade
    r = np.hypot(px, py)
    lab[(r < 1.55) & (lab >= 0)] = 3
    lab[r < 0.8] = 4
    cols = {0: (255, 252, 244), 1: (236, 232, 218), 2: (206, 196, 176), 3: (250, 218, 120), 4: (238, 176, 70)}
    out = np.zeros((n, n, 4), np.int32)
    for y in range(n):
        for x in range(n):
            blk = lab[y * S:(y + 1) * S, x * S:(x + 1) * S].ravel()
            vals = blk[blk >= 0]
            if len(vals) < S * S * 0.45: continue
            c = np.bincount(vals).argmax()
            out[y, x, :3] = cols[c]; out[y, x, 3] = 255
    return out

def replant_plumeria(a, seed):
    """Swap the blurry blossoms for crisp frangipani flowers at the same spots."""
    a = a.copy(); h, w = a.shape[:2]
    rgb = a[..., :3]; op = a[..., 3] > 0
    flower = op & (rgb[..., 0] > 170) & (rgb[..., 1] > 150)
    # centres of the flower clusters
    seen = np.zeros_like(flower); centres = []
    for y in range(h):
        for x in range(w):
            if flower[y, x] and not seen[y, x]:
                q = [(y, x)]; seen[y, x] = True; pts = []
                while q:
                    cy, cx = q.pop(); pts.append((cy, cx))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and flower[ny, nx] and not seen[ny, nx]:
                                seen[ny, nx] = True; q.append((ny, nx))
                if len(pts) >= 2: centres.append(np.mean(pts, axis=0))
    # paint the old flower pixels over with surrounding leaf colour
    for _ in range(6):
        fl = flower.copy()
        for y in range(h):
            for x in range(w):
                if not fl[y, x]: continue
                nb = [rgb[yy, xx] for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)) if 0 <= yy < h and 0 <= xx < w and op[yy, xx] and not fl[yy, xx]]
                if nb: rgb[y, x] = np.mean(nb, axis=0); flower[y, x] = False
    rng = np.random.RandomState(seed)
    for cy, cx in centres:
        f = plumeria_flower(rng.rand() * 6.28)
        y0, x0 = int(round(cy)) - 3, int(round(cx)) - 3
        for y in range(7):
            for x in range(7):
                if f[y, x, 3] and 0 <= y0 + y < h and 0 <= x0 + x < w and op[y0 + y, x0 + x]:
                    a[y0 + y, x0 + x, :3] = f[y, x, :3]
    return a

# ---------------------------------------------------------------- professional leaf shading
# Every leaf / leaflet / petal is found as its own shape (the dark gaps between leaves in the
# original art separate them). Each shape is then shaded like a hand-pixelled form: the edge
# facing the sun (top-left) gets one step lighter, the far edge one step darker, the midrib
# ridge catches a highlight, and the gaps become crisp dark lines in that leaf's own darkest
# shade. Colours come from small hue-shifted ramps (cool, deep shadows -> warm highlights).
FAM = {
    "yg":     [(40, 88, 44), (76, 132, 46), (118, 170, 56), (168, 204, 78), (220, 234, 132)],
    "g":      [(26, 72, 52), (46, 116, 58), (80, 156, 64), (126, 192, 80), (186, 222, 120)],
    "bg":     [(20, 58, 60), (32, 94, 76), (54, 130, 90), (90, 166, 106), (148, 200, 142)],
    "red":    [(88, 18, 42), (144, 28, 50), (198, 50, 58), (236, 96, 80), (255, 166, 136)],
    "white":  [(128, 126, 132), (192, 186, 180), (230, 226, 214), (248, 246, 236), (255, 255, 250)],
    "yellow": [(160, 96, 32), (212, 148, 46), (246, 200, 80), (255, 232, 150), (255, 248, 210)],
    "brown":  [(50, 28, 32), (88, 52, 40), (130, 80, 52), (172, 116, 72), (210, 160, 104)],
}
def _family(c):
    r, g, b = c
    if r > 140 and r > g * 1.6: return "red"
    if r > 185 and g > 175 and b > 130: return "white"
    if r > 180 and g > 130 and b < 135 and r >= g * 0.9: return "yellow"
    if r >= g and r - b > 15: return "brown"
    warm = (r - b) / max(g, 1)
    return "yg" if warm > 0.36 else "g" if warm > 0.1 else "bg"

def leafshade(sp, flowers=False):
    sp = pad(trim(sp), 1)
    h, w = sp.shape[:2]
    op = sp[..., 3] > 0
    rgb = sp[..., :3].astype(np.float64)
    L = rgb[..., 0] * 0.3 + rgb[..., 1] * 0.59 + rgb[..., 2] * 0.11
    Lp = np.pad(L, 1, mode="edge")
    nb = (Lp[:-2, 1:-1] + Lp[2:, 1:-1] + Lp[1:-1, :-2] + Lp[1:-1, 2:]) / 4
    r_, g_, b_ = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    pc = np.zeros((h, w), np.int32)                     # material per pixel: 0 leaf 1 wood 2 red 3 white 4 yellow
    pc[(r_ >= g_) & (r_ - b_ > 15) & (L < 205)] = 1
    mx_ = np.maximum(np.maximum(r_, g_), b_); mn_ = np.minimum(np.minimum(r_, g_), b_)
    pc[(r_ > 220) & (g_ > 150) & (b_ < 110) & (r_ >= g_) & (r_ - b_ > 120)] = 4
    pc[(r_ > 185) & (g_ > 175) & (b_ > 140) & (mx_ - mn_ < 70)] = 3
    pc[(r_ > 140) & (r_ > g_ * 1.6) & (r_ > b_ * 1.4)] = 2
    if not flowers: pc[pc >= 2] = 0                    # only the flowering bushes have petals
    elif flowers == "red": pc[pc >= 3] = 0             # hibiscus: red petals only
    thr = np.percentile(L[op & (pc == 0)], 22) if (op & (pc == 0)).any() else 0
    dark = op & (pc <= 1) & (L < thr) & (L < nb - 4)
    leaf = op & ~dark
    lab = np.full((h, w), -1, np.int32); regions = []
    for y in range(h):
        for x in range(w):
            if leaf[y, x] and lab[y, x] < 0:
                k = len(regions); q = [(y, x)]; lab[y, x] = k; pts = []
                while q:
                    cy, cx = q.pop(); pts.append((cy, cx))
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and leaf[ny, nx] and lab[ny, nx] < 0 and pc[ny, nx] == pc[y, x]:
                            lab[ny, nx] = k; q.append((ny, nx))
                regions.append(pts)
    # tiny fragments join their most common neighbouring region
    for k, pts in enumerate(regions):
        if len(pts) >= 5: continue
        cnt = {}
        for cy, cx in pts:
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < h and 0 <= nx < w and lab[ny, nx] >= 0 and lab[ny, nx] != k and len(regions[lab[ny, nx]]) >= 5 and pc[ny, nx] == pc[cy, cx]:
                    cnt[lab[ny, nx]] = cnt.get(lab[ny, nx], 0) + 1
        if cnt:
            t = max(cnt, key=cnt.get)
            for cy, cx in pts: lab[cy, cx] = t
            regions[t] = regions[t] + pts; regions[k] = []
    fam, base = {}, {}
    means = []
    for k, pts in enumerate(regions):
        if not pts: continue
        ys, xs = zip(*pts)
        c = rgb[ys, xs].mean(0)
        cls_ = pc[ys[0], xs[0]]
        if cls_ == 0:
            warm = (c[0] - c[2]) / max(c[1], 1)
            fam[k] = "yg" if warm > 0.3 else "g" if warm > 0.06 else "bg"
        else:
            fam[k] = ["g", "brown", "red", "white", "yellow"][cls_]
        means.append((k, L[ys, xs].mean()))
    if means:
        ms = np.array([m for _, m in means]); q1, q2 = np.percentile(ms, [33, 70])
        for k, m in means: base[k] = 1 if m < q1 else 2 if m < q2 else 3
    out = np.zeros((h, w, 4), np.int32)
    LIGHT = np.array([-1.0, -1.0])
    for k, pts in enumerate(regions):
        if not pts: continue
        ramp = FAM[fam[k]]
        pset = set(pts)
        # distance from the region edge (4-connected)
        d = {}
        frontier = []
        for cy, cx in pts:
            n = np.zeros(2); edge = False
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if (cy + dy, cx + dx) not in pset: n += (dx, dy); edge = True
            if edge: d[(cy, cx)] = 1; frontier.append((cy, cx))
        while frontier:
            nf = []
            for cy, cx in frontier:
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    p_ = (cy + dy, cx + dx)
                    if p_ in pset and p_ not in d: d[p_] = d[(cy, cx)] + 1; nf.append(p_)
            frontier = nf
        for cy, cx in pts:
            lv = base[k]
            if d[(cy, cx)] == 1:
                n = np.zeros(2)
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if (cy + dy, cx + dx) not in pset: n += (dx, dy)
                f = n @ LIGHT
                lv += 1 if f > 0 else -1 if f < 0 else 0
            elif len(pts) > 12 and d[(cy, cx)] >= 2 and all(d.get((cy + dy, cx + dx), 0) <= d[(cy, cx)] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                lv += 1                                      # midrib / ridge highlight
            out[cy, cx, :3] = ramp[int(np.clip(lv, 0, 4))]; out[cy, cx, 3] = 255
    # gaps between leaves: the neighbouring leaf's darkest shade
    for y in range(h):
        for x in range(w):
            if not dark[y, x]: continue
            cnt = {}
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and lab[ny, nx] >= 0 and lab[ny, nx] in fam:
                        cnt[fam[lab[ny, nx]]] = cnt.get(fam[lab[ny, nx]], 0) + 1
            f_ = max(cnt, key=cnt.get) if cnt else "g"
            out[y, x, :3] = (np.array(FAM[f_][0]) * 0.8).astype(np.int32); out[y, x, 3] = 255
    # outer outline: darkest shade of what it wraps, deeper on the shadow (bottom/right) side
    res = out.copy()
    for y in range(h):
        for x in range(w):
            if out[y, x, 3]: continue
            best = None
            for dy, dx, f in ((-1, 0, 0.72), (0, -1, 0.75), (1, 0, 1.0), (0, 1, 0.95)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and out[ny, nx, 3]:
                    k = lab[ny, nx]
                    f_ = fam.get(k, "g") if k >= 0 else "g"
                    c = np.array(FAM[f_][0]) * f * 0.7
                    best = c if best is None else np.minimum(best, c)
            if best is not None: res[y, x, :3] = best.astype(np.int32); res[y, x, 3] = 255
    return res

def wind_frames(img, green, pivot, mode, amp, bob, seed):
    """Wind frames from a finished sprite. Crowns tilt as a whole and their tips stretch
    downwind; plants bend from a planted base with the top dipping. The rustle is patches
    of leaves catching the light (flipping), plus a gentle bob of whole leaves."""
    h, w = img.shape[:2]
    padx, pady = int(np.ceil(amp + 4)), int(np.ceil(bob + 4))
    fw, fh = w + 2 * padx, h + 2 * pady
    opx, opy = pivot[0] + 0.5 + padx, pivot[1] + 0.5 + pady
    yy, xx = np.mgrid[0:fh, 0:fw].astype(np.float64)
    vx, vy = xx + 0.5 - opx, yy + 0.5 - opy
    frames = []
    for lv in WIND_LEVELS:
        for f in range(WIND_FLUTTER):
            nz = _vnoise((h, w), 3, seed * 31 + f)
            flick = green & (nz > 0.84 - 0.24 * max(lv, 0))
            im2 = img.copy()
            im2[flick, :3] = np.minimum(255, im2[flick, :3] * 1.13 + np.array([10, 12, 2]))
            big = scale2x(scale2x(scale2x(pack(im2))))
            ph = f * 1.9 + seed
            if mode == "crown":
                R = max(w, h) * 0.5
                r = np.clip(np.hypot(vx, vy) / R, 0, 1.5); th_ = np.arctan2(vy, vx)
                a_ = np.radians(7.0 * lv)
                ux, uy = np.cos(a_) * vx + np.sin(a_) * vy, -np.sin(a_) * vx + np.cos(a_) * vy
                ux = ux - lv * 1.6 * r ** 2
                uy = uy - bob * np.clip(r - 0.45, 0, 1) * 1.6 * np.sin(th_ * 2 + ph) * (0.3 + max(lv, 0))
                sx, sy = ux, uy
            else:
                hgt = np.clip(-vy / max(1, pivot[1]), 0, 1.2)
                dx = lv * amp * hgt ** 1.6
                dy = abs(lv) * amp * 0.22 * hgt ** 2 + bob * hgt ** 2 * np.sin(xx * 0.22 + ph) * (0.3 + max(lv, 0))
                sx, sy = vx - dx, vy - dy
            bx = np.floor((sx + pivot[0] + 0.5) * 8).astype(int)
            by = np.floor((sy + pivot[1] + 0.5) * 8).astype(int)
            ok = (bx >= 0) & (by >= 0) & (bx < w * 8) & (by < h * 8)
            fr = np.zeros((fh, fw), np.uint32)
            fr[ok] = big[by[ok], bx[ok]]
            frames.append(unpack(fr))
    m = {"fw": fw, "fh": fh, "px": int(round(opx - 0.5)), "py": int(round(opy - 0.5)), "n": len(frames), "levels": len(WIND_LEVELS), "flutter": WIND_FLUTTER}
    return np.concatenate(frames, axis=1), m

def windy(name, src, factor, mode, amp, bob, mask=None, pivot_fn=None, seed=1, plumeria=False, colors=40, sharp=70):
    src = src.copy()
    rgb = Image.fromarray(src[..., :3].astype(np.uint8)).filter(ImageFilter.UnsharpMask(radius=2, percent=sharp, threshold=3))
    src[..., :3] = np.array(rgb).astype(np.int32)
    for flip in (False, True):
        s_ = src[:, ::-1].copy() if flip else src
        sp = sprite(s_, factor, colors=colors, do_outline=False)
        if mask:
            sp = mask(sp[:, ::-1].copy())[:, ::-1].copy() if flip else mask(sp)
        sp = trim(largest_parts(sp))
        img = leafshade(sp, flowers=True if plumeria else ("red" if name.startswith("bush") else False))
        if plumeria: img = replant_plumeria(img, seed + flip)
        rgb_ = img[..., :3]
        green = (img[..., 3] > 0) & (rgb_[..., 1] >= rgb_[..., 0]) & (rgb_[..., 1] > 70) & ~((rgb_[..., 0] > 200) & (rgb_[..., 1] > 200))
        if pivot_fn:
            pv = pivot_fn(img)
        else:
            ys = np.nonzero(img[..., 3])[0]
            pv = (img.shape[1] // 2, int(ys.max()))
        strip, m = wind_frames(img, green, pv, mode, amp, bob, seed + (7 if flip else 0))
        key = name + ("_f" if flip else "")
        put(key, strip)
        meta[key] = m

def texturize(sp, amount=0.75):
    """Bring out the leaf texture of the original art: lift fine detail (leaflets, veins, frond
    edges) against its 3x3 surroundings, lean lit greens a touch warm and shaded greens cool,
    then snap back onto the sprite's own palette so it stays clean pixel art."""
    sp = sp.copy(); op = sp[..., 3] > 0
    rgb = sp[..., :3].astype(np.float64)
    h, w = op.shape
    P = np.pad(rgb * op[..., None], ((1, 1), (1, 1), (0, 0)))
    O = np.pad(op.astype(np.float64), 1)
    acc = sum(P[1 + dy:1 + dy + h, 1 + dx:1 + dx + w] for dy in (-1, 0, 1) for dx in (-1, 0, 1))
    cnt = sum(O[1 + dy:1 + dy + h, 1 + dx:1 + dx + w] for dy in (-1, 0, 1) for dx in (-1, 0, 1))
    blur = acc / np.maximum(cnt, 1)[..., None]          # neighbours inside the sprite only
    rgb = rgb + (rgb - blur) * amount
    L = rgb[..., 0] * 0.3 + rgb[..., 1] * 0.59 + rgb[..., 2] * 0.11
    green = op & (rgb[..., 1] > rgb[..., 0])
    if green.any():
        lo, hi = np.percentile(L[green], [5, 95]); t = np.clip((L - lo) / max(1, hi - lo), 0, 1)
        g = rgb[green]
        g += (np.array([245, 235, 120.0]) - g) * (0.12 * t[green])[:, None]
        g += (np.array([14, 50, 70.0]) - g) * (0.12 * (1 - t[green]))[:, None]
        rgb[green] = g
    pal = palette_of(sp, 40)
    pal = np.concatenate([pal, (pal * 0.82).astype(np.int32)])
    pal = pal[(pal[:, 0] * 0.3 + pal[:, 1] * 0.59 + pal[:, 2] * 0.11) < 215]     # no near-white glints on leaves
    out = sp.copy(); out[..., :3] = np.clip(rgb, 0, 255).astype(np.int32)
    out, _ = snap(out, pal); out[..., 3] = sp[..., 3]
    return out

def selout(a):
    """1px outline in a dark shade of the colour it wraps (deeper on the shadow side)."""
    a = pad(trim(a), 1).astype(np.float64)
    op = a[..., 3] > 0; rgb = a[..., :3]
    acc = np.zeros_like(rgb); cnt = np.zeros(op.shape)
    for dy, dx, f in [(-1, 0, 0.42), (0, -1, 0.46), (1, 0, 0.55), (0, 1, 0.5)]:
        m = ~op & _shift(op, dy, dx)
        acc[m] += _shift(rgb, dy, dx)[m] * f; cnt[m] += 1
    m = cnt > 0
    ol = acc[m] / cnt[m][:, None]; ol[:, 0] *= 0.8; ol[:, 2] = ol[:, 2] * 1.1 + 6
    out = rgb.copy(); out[m] = ol
    res = np.zeros(a.shape, np.int32); res[..., :3] = np.clip(out, 0, 255).astype(np.int32)
    res[..., 3] = np.where(op | m, 255, 0)
    return res

def whiten_flowers(img, seed):
    """Turn the hibiscus bush's red blooms into frangipani: cream-white petals, soft lilac-grey
    shading and a warm yellow heart in the middle of each bloom."""
    img = img.copy(); rgb = img[..., :3]; op = img[..., 3] > 0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    red = op & (r > g * 1.35) & (r > 60) & (r > b * 1.2)
    L = r * 0.3 + g * 0.59 + b * 0.11
    if not red.any(): return img
    lo, hi = np.percentile(L[red], [5, 95]); t = np.clip((L - lo) / max(1, hi - lo), 0, 1)
    W = np.array([(150, 146, 158), (204, 202, 206), (236, 234, 226), (250, 248, 238), (255, 255, 250)])
    k = np.clip(np.round(t * 4), 0, 4).astype(int)
    rgb[red] = W[k[red]]
    # yellow hearts: the centre of each bloom
    h, w = red.shape; seen = np.zeros_like(red)
    for y in range(h):
        for x in range(w):
            if red[y, x] and not seen[y, x]:
                q = [(y, x)]; seen[y, x] = True; pts = []
                while q:
                    cy, cx = q.pop(); pts.append((cy, cx))
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and red[ny, nx] and not seen[ny, nx]: seen[ny, nx] = True; q.append((ny, nx))
                if len(pts) < 6: continue
                my, mx = np.mean(pts, axis=0); my, mx = int(round(my)), int(round(mx))
                for (dy, dx), c in [((0, 0), (250, 200, 70)), ((-1, 0), (255, 226, 120)), ((0, -1), (255, 226, 120)), ((1, 0), (232, 168, 60)), ((0, 1), (232, 168, 60))]:
                    yy, xx = my + dy, mx + dx
                    if 0 <= yy < h and 0 <= xx < w and op[yy, xx]: rgb[yy, xx] = c
    img[..., :3] = rgb
    return img

def taro_mid(sp):
    """Kalo, take 3: clean but not flat. Six hue-shifted greens over lightly smoothed shading
    (keeps each leaf's form), a light rim where a leaf's top-left edge catches the sun, pale
    veins from the original art, and crisp dark seams between overlapping leaves."""
    sp = sp.copy(); op = sp[..., 3] > 0; h, w = op.shape
    rgb = sp[..., :3].astype(np.float64)
    L = rgb[..., 0] * 0.3 + rgb[..., 1] * 0.59 + rgb[..., 2] * 0.11
    P = np.pad(L, 1, mode="edge")
    Lb = (sum(P[1 + dy:1 + dy + h, 1 + dx:1 + dx + w] for dy in (-1, 0, 1) for dx in (-1, 0, 1)) + 3 * L) / 12
    nb = (P[:-2, 1:-1] + P[2:, 1:-1] + P[1:-1, :-2] + P[1:-1, 2:]) / 4
    lo, hi = np.percentile(Lb[op], [6, 97]); t = np.clip((Lb - lo) / max(1, hi - lo), 0, 1)
    lev = np.digitize(t, [0.14, 0.32, 0.52, 0.72, 0.88])
    stack = np.stack([np.pad(lev, 1, mode="edge")[1 + dy:1 + dy + h, 1 + dx:1 + dx + w] for dy in (-1, 0, 1) for dx in (-1, 0, 1)])
    mode = np.stack([(stack == k).sum(0) for k in range(6)]).argmax(0)
    lev = np.where(np.stack([(stack == k).sum(0) for k in range(6)]).max(0) >= 5, mode, lev)   # only clean up noise
    seam = op & (L < np.percentile(L[op], 14)) & (L < nb - 6)
    up = np.pad(seam | ~op, ((1, 0), (0, 0)), constant_values=True)[:-1]
    left = np.pad(seam | ~op, ((0, 0), (1, 0)), constant_values=True)[:, :-1]
    rim = op & ~seam & (up | left) & (lev >= 1)
    lev = np.where(rim, np.minimum(5, lev + 1), lev)
    vein = op & ~seam & (L - nb > 16) & (lev >= 2)
    lev = np.where(vein, np.maximum(lev, 4), lev)
    RAMP6 = np.array([(16, 52, 46), (26, 84, 60), (42, 118, 70), (70, 154, 78), (114, 190, 88), (178, 226, 120)])
    out = sp.copy(); out[..., :3] = RAMP6[lev]
    out[seam, :3] = np.array([12, 38, 34])
    out[~op] = 0
    return out

def taro_clean(sp):
    """Kalo repainted from scratch: same silhouette, four bold greens, simplified with a mode
    filter so leaves read as clean shapes, a bright midrib, and dark seams between leaves."""
    sp = sp.copy(); op = sp[..., 3] > 0; h, w = op.shape
    rgb = sp[..., :3].astype(np.float64)
    L = rgb[..., 0] * 0.3 + rgb[..., 1] * 0.59 + rgb[..., 2] * 0.11
    P = np.pad(L, 1, mode="edge"); Lb = sum(P[1 + dy:1 + dy + h, 1 + dx:1 + dx + w] for dy in (-1, 0, 1) for dx in (-1, 0, 1)) / 9
    lo, hi = np.percentile(Lb[op], [6, 96]); t = np.clip((Lb - lo) / max(1, hi - lo), 0, 1)
    lev = np.where(t < 0.2, 0, np.where(t < 0.5, 1, np.where(t < 0.8, 2, 3)))
    for _ in range(3):
        Pl = np.pad(lev, 1, mode="edge")
        stack = np.stack([Pl[1 + dy:1 + dy + h, 1 + dx:1 + dx + w] for dy in (-1, 0, 1) for dx in (-1, 0, 1)])
        lev = np.stack([(stack == k).sum(0) for k in range(4)]).argmax(0)
    RAMP_C = np.array([(26, 84, 58), (50, 136, 70), (96, 184, 78), (172, 226, 110)])
    out = sp.copy(); out[..., :3] = RAMP_C[lev]
    Pn = np.pad(L, 1, mode="edge"); nb = (Pn[:-2, 1:-1] + Pn[2:, 1:-1] + Pn[1:-1, :-2] + Pn[1:-1, 2:]) / 4
    rib = op & (L - nb > 22) & (lev >= 1)
    out[rib, :3] = np.array([150, 210, 110])
    up = np.pad(lev, ((1, 0), (0, 0)), mode="edge")[:-1]
    out[op & (up - lev >= 2), :3] = np.array([12, 40, 36])
    out[~op] = 0
    return out

def taro_greens(sp):
    """Kalo leaves: a wide, hue-shifted green ramp (deep blue-green shade -> bright lime light),
    per-pixel so the vein texture of the original is kept, plus a lighter midrib/vein lift."""
    sp = sp.copy(); rgb = sp[..., :3].astype(np.float64); op = sp[..., 3] > 0
    L = rgb[..., 0] * 0.3 + rgb[..., 1] * 0.59 + rgb[..., 2] * 0.11
    gr = op & (rgb[..., 1] >= rgb[..., 0])
    if not gr.any(): return sp
    lo, hi = np.percentile(L[gr], [4, 96]); t = np.clip((L - lo) / max(1, hi - lo), 0, 1)
    P = np.pad(L, 1, mode="edge"); nb = (P[:-2, 1:-1] + P[2:, 1:-1] + P[1:-1, :-2] + P[1:-1, 2:]) / 4
    t = np.clip(t + np.clip((L - nb) / 40, -0.15, 0.25), 0, 1)        # veins / edges pop
    RAMP_T = np.array([(12, 40, 44), (20, 70, 58), (34, 104, 70), (56, 140, 76), (96, 176, 82), (150, 206, 96), (206, 232, 136)], float)
    idx = np.clip(np.round(t * (len(RAMP_T) - 1)), 0, len(RAMP_T) - 1).astype(int)
    rgb[gr] = RAMP_T[idx[gr]]
    sp[..., :3] = rgb.astype(np.int32)
    return sp

def orig_plant(name, src, factor, mode, amp, bob, mask=None, pivot_fn=None, seed=1, colors=40, tex=0.75, sharp=60, style="tex", white=False):
    src = src.copy()
    rgb = Image.fromarray(src[..., :3].astype(np.uint8)).filter(ImageFilter.UnsharpMask(radius=2, percent=sharp, threshold=3))
    src[..., :3] = np.array(rgb).astype(np.int32)
    for flip in (False, True):
        s_ = src[:, ::-1].copy() if flip else src
        sp = sprite(s_, factor, colors=colors, do_outline=False)
        if mask: sp = mask(sp[:, ::-1].copy())[:, ::-1].copy() if flip else mask(sp)
        sp = trim(largest_parts(sp))
        if style == "tex":
            img = selout(texturize(sp, tex))
        elif style == "fern":
            img = outline(pad(taro_mid(sp)), (12, 30, 26))
        else:                            # the hibiscus look
            img = leafshade(sp, flowers="red")
        if white: img = whiten_flowers(img, seed)
        rgb_ = img[..., :3]
        green = (img[..., 3] > 0) & (rgb_[..., 1] >= rgb_[..., 0]) & (rgb_[..., 1] > 70) & ~((rgb_[..., 0] > 200) & (rgb_[..., 1] > 200))
        if pivot_fn: pv = pivot_fn(img)
        else:
            ys = np.nonzero(img[..., 3])[0]; pv = (img.shape[1] // 2, int(ys.max()))
        strip, m = wind_frames(img, green, pv, mode, amp, bob, seed + (7 if flip else 0))
        key = name + ("_f" if flip else "")
        put(key, strip); meta[key] = m

print("hero plants (original sprites, detailed + wind frames)")
hib = key_flood(cell(2, 0, 2), is_sand)
# (the original hibiscus tile is processed after native() is defined, see "trees" below)
plu = key_flood(cell(2, 1, 2), is_sand)


print("flora")
FK = key_dark(FLORA, 40)
put("flora_fern", finish(sprite(FK[30:505, 15:510], 6.5, colors=24, do_outline=False), (12, 34, 24), lambda a: round_mask(a, 2.4, 11, 0.14)))
put("flora_monstera", finish(sprite(FK[30:500, 525:1010], 6.5, colors=24, do_outline=False), (12, 34, 24), lambda a: round_mask(a, 2.4, 12, 0.14)))
# (taro now comes from docs/plant_taro_new.png, see below)
def sub_plant(region, seeds, factor):
    return sprite(keep_component(region, seeds), factor, colors=24)
taro = FK[520:1005, 5:500]

mon = FK[30:500, 525:1010]
put("plant_monstera_a", sub_plant(mon[230:470, 0:250].copy(), [(80, 80), (170, 70), (170, 190), (90, 190)], 5.5))

print("trees (native pixel grid, 1.5x pixel-art upscale)")
TREES_RGBA = TREES
def native(reg, p=5.1):
    """Sample source art on its own pixel grid (phase with the least within-cell change), so the
    original pixels come back exactly instead of being smeared by an off-grid resample."""
    h, w = reg.shape[:2]; best = None
    for oy in np.arange(0, p, 0.34):
        for ox in np.arange(0, p, 0.34):
            ys = np.arange(oy + p / 2, h - 1, p).astype(int); xs = np.arange(ox + p / 2, w - 1, p).astype(int)
            c = reg[ys][:, xs].astype(float); n = reg[np.clip(ys + 1, 0, h - 1)][:, np.clip(xs + 1, 0, w - 1)].astype(float)
            v = np.abs(c - n).sum()
            if best is None or v < best[0]: best = (v, oy, ox)
    _, oy, ox = best
    ys = np.arange(oy + p / 2, h - 1, p); xs = np.arange(ox + p / 2, w - 1, p)
    out = np.zeros((len(ys), len(xs), 4), np.int32)
    for i, y in enumerate(ys):
        for j, x in enumerate(xs):
            y0, x0 = int(y - 1), int(x - 1)
            out[i, j] = np.median(reg[max(0, y0):y0 + 3, max(0, x0):x0 + 3].reshape(-1, 4), axis=0)
    return out

def upscale(a, s):
    """pixel-art upscale by a non-integer factor: Scale2x twice (4x) then majority vote per cell"""
    big = scale2x(scale2x(pack(a)))
    H, W = big.shape; th, tw = int(round(a.shape[0] * s)), int(round(a.shape[1] * s))
    out = np.zeros((th, tw), np.uint32)
    for y in range(th):
        y0 = int(y * H / th); y1 = max(y0 + 1, int((y + 1) * H / th))
        for x in range(tw):
            x0 = int(x * W / tw); x1 = max(x0 + 1, int((x + 1) * W / tw))
            v, c = np.unique(big[y0:y1, x0:x1], return_counts=True)
            out[y, x] = v[c.argmax()]
    return unpack(out)

def leaf_pop(a):
    """more contrast in the greens: deeper cool shadows, brighter warm highlights (same pixels)"""
    a = a.copy(); rgb = a[..., :3].astype(np.float64); op = a[..., 3] > 0
    gr = op & (rgb[..., 1] > rgb[..., 0] + 8)
    if gr.any():
        L = rgb[..., 0] * 0.3 + rgb[..., 1] * 0.59 + rgb[..., 2] * 0.11
        lo, hi = np.percentile(L[gr], [8, 92]); t = np.clip((L - lo) / max(1, hi - lo), 0, 1)
        g = rgb[gr]; tt = t[gr][:, None]
        g = g * (0.7 + 0.6 * tt)                                   # stretch
        g += (np.array([10, 40, 52.0]) - g) * 0.22 * (1 - tt)       # cool shade
        g += (np.array([230, 240, 110.0]) - g) * 0.14 * tt ** 2     # warm light
        rgb[gr] = g
    a[..., :3] = np.clip(rgb, 0, 255).astype(np.int32)
    return a

def tree_art(reg, keep_largest=True, sand=False, scale=1.5):
    n = native(reg)
    # background = dark (or sand) pixels connected to the image edge; dark bark inside stays solid
    # background = dark (or sand) pixels; small enclosed pockets (dark bark texture) are kept solid,
    # big enclosed gaps (sky between trunks) stay see-through
    bgm = (n[..., :3].max(2) < 42) | (is_sand(n) if sand else False)
    h_, w_ = bgm.shape; lab = np.zeros((h_, w_), int); k_ = 0
    for y in range(h_):
        for x in range(w_):
            if bgm[y, x] and not lab[y, x]:
                k_ += 1; q = [(y, x)]; lab[y, x] = k_; pts = []; edge = False
                while q:
                    cy, cx = q.pop(); pts.append((cy, cx))
                    if cy in (0, h_ - 1) or cx in (0, w_ - 1): edge = True
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h_ and 0 <= nx < w_ and bgm[ny, nx] and not lab[ny, nx]: lab[ny, nx] = k_; q.append((ny, nx))
                if not edge and len(pts) <= 14:
                    for cy, cx in pts: bgm[cy, cx] = False
    n[bgm] = 0
    if keep_largest:
        # split on the dark outlines: keep the biggest bright mass, then give back its outline
        L = n[..., 0] * 0.3 + n[..., 1] * 0.59 + n[..., 2] * 0.11
        bright = n.copy(); bright[(L < 62) | (n[..., 3] == 0)] = 0
        core = keep_component(bright, _largest(bright))[..., 3] > 0
        grow = core.copy()
        for _ in range(2):
            g2 = grow.copy(); g2[1:] |= grow[:-1]; g2[:-1] |= grow[1:]; g2[:, 1:] |= grow[:, :-1]; g2[:, :-1] |= grow[:, 1:]
            grow = g2
        n[~(core | (grow & (L < 62)))] = 0
    n = leaf_pop(trim(n))
    u = upscale(n, scale)
    return selout(u)

def _largest(n):
    """seed points of the largest connected opaque component"""
    h, w = n.shape[:2]; op = n[..., 3] > 0; lab = np.zeros((h, w), int); best = (0, None); k = 0
    for y in range(h):
        for x in range(w):
            if op[y, x] and not lab[y, x]:
                k += 1; q = [(y, x)]; lab[y, x] = k; c = 0
                while q:
                    cy, cx = q.pop(); c += 1
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and op[ny, nx] and not lab[ny, nx]: lab[ny, nx] = k; q.append((ny, nx))
                if c > best[0]: best = (c, (y, x))
    return [best[1]]

def tree_windy(name, img, mode, amp, bob, pivot_fn=None, seed=1):
    for flip in (False, True):
        im = img[:, ::-1].copy() if flip else img
        rgb_ = im[..., :3]
        green = (im[..., 3] > 0) & (rgb_[..., 1] > rgb_[..., 0] + 8)
        if pivot_fn: pv = pivot_fn(im)
        else:
            ys = np.nonzero(im[..., 3])[0]; pv = (im.shape[1] // 2, int(ys.max()))
        strip, m = wind_frames(im, green, pv, mode, amp, bob, seed + (7 if flip else 0))
        key = name + ("_f" if flip else "")
        put(key, strip); meta[key] = m

TK = key_dark(TREES, 40)
def _hib():
    n = native(cell(2, 0, 2), 277 / 64)                  # the hibiscus tile on its own pixel grid
    n = key_flood(n, lambda q: is_sand(q) | (q[..., :3].max(2) < 40))
    return trim(keep_component(n, _largest(n)))
tree_windy("bush_hibiscus", outline(pad(_hib()), (12, 34, 24)), "base", 2.0, 0.0, seed=3)

# Taro (kalo): the user's new art. Sampled on its own pixel grid (~3.54px), the navy backdrop
# keyed out where it touches the edge (dark stems and gaps between leaves stay solid), then
# reduced to the old in-game sizes by majority vote so the pixels stay clean.
TN = native(load("plant_taro_new.png"), 3.54)
navy = (TN[..., :3].max(2) < 48) & (TN[..., 2] >= TN[..., 1])      # the backdrop is navy; stems are green
TN[navy] = 0
TN = trim(TN)
def taro_sprite(src, height):
    h0, w0 = src.shape[:2]
    img = crisp(src, (max(1, round(w0 * height / h0)), height), 30, sharpen=True)
    return selout(trim(img))
tree_windy("flora_taro", taro_sprite(TN, 72), "base", 3.0, 0.9, seed=5)
tree_windy("plant_taro_a", taro_sprite(trim(TN[:, : TN.shape[1] // 2].copy()), 84), "base", 3.6, 1.0, seed=6)

def cut(reg, rects):
    reg = reg.copy()
    for x0, y0, x1, y1 in rects: reg[y0:y1, x0:x1] = 0      # remove neighbouring palms (crop coords)
    return reg
tree_windy("crown_a", tree_art(cut(TREES[517:706, 530:772], [(133, 146, 242, 189), (88, 160, 110, 189), (132, 160, 242, 189)])), "crown", 3.4, 1.0, crown_pivot, seed=9)
tree_windy("crown_d", tree_art(cut(TREES[548:712, 790:1013], [(0, 98, 36, 164), (0, 138, 70, 164)])), "crown", 3.4, 1.0, crown_pivot, seed=10)
tree_windy("tree_grove", tree_art(TREES[517:962, 518:1016], keep_largest=False, sand=True, scale=1.35), "base", 3.4, 0.6, seed=8)

# bark: drawn in the source trunk's own palette. Even taper (9 -> 12px), lit from the left,
# ring bands that slant like the original's overlapping leaf scars, a lit lip under each ring,
# a few cracks, and a flared foot.
# skinny trunk made from the palm cluster's own bark: the cluster's middle trunk is straightened
# row by row, then tiled down the trunk and resampled to the skinny width (4 -> 6px + outline)
G_img = tree_art(TREES[517:962, 518:1016], keep_largest=False, sand=True, scale=1.35)
rows, cx_prev = [], 64.0
for y in range(72, 107):
    r_ = G_img[y]; runs, x = [], 0
    while x < r_.shape[0]:
        if r_[x, 3] and r_[x, 0] >= r_[x, 1]:
            x0 = x
            while x < r_.shape[0] and r_[x, 3] and r_[x, 0] >= r_[x, 1]: x += 1
            runs.append((x0, x))
        else: x += 1
    runs = [q for q in runs if 4 <= q[1] - q[0] <= 11]
    if not runs: continue
    x0, x1 = min(runs, key=lambda q: abs((q[0] + q[1]) / 2 - cx_prev)); cx_prev = (x0 + x1) / 2
    seg = G_img[y, x0:x1]
    body = seg[1:-1] if len(seg) > 3 else seg               # drop the outline pixels, re-add later
    rows.append(body)
H_ = 132
even = np.zeros((H_ + 2, 10, 4), np.int32)
OUT_C = np.array([34, 18, 20, 255])
for y in range(H_):
    src = rows[y % len(rows)]
    tw = int(round(4 + 2 * (y / (H_ - 1)))); off = (10 - tw) // 2
    for i in range(tw): even[y, off + i] = src[min(len(src) - 1, int((i + 0.5) * len(src) / tw))]
    even[y, off - 1] = OUT_C; even[y, off + tw] = OUT_C
for y in (H_, H_ + 1):
    for i in range(1, 9): even[y, i] = rows[-1][min(len(rows[-1]) - 1, i * len(rows[-1]) // 9)]
    even[y, 0] = OUT_C; even[y, 9] = OUT_C
put("trunk_a", even)

# ---------------------------------------------------------------- Sun Gate sanctum + Volcanic Highlands
print("sanctum / highlands tiles (docs/ref_1045.png)")
REF = load("ref_1045.png")
RC = [(10, 352), (362, 705), (715, 1059), (1068, 1402)]
RR = [(0, 241), (257, 512), (522, 779), (787, 1040)]
def rcell(c, r, inset=4):
    (x0, x1), (y0, y1) = RC[c], RR[r]
    return REF[y0 + inset:y1 - inset, x0 + inset:x1 - inset].copy()
def nat_tex(c, r, crop=None):
    n = native(rcell(c, r), 6.56); n[..., 3] = 255
    if crop: n = n[crop[1]:crop[3], crop[0]:crop[2]]
    h, w = n.shape[:2]; y0, x0 = (h - 32) // 2, (w - 32) // 2
    sq = n[y0:y0 + 32, x0:x0 + 32].copy()
    pal = palette_of(n, 40)
    sm = seamless(sq); sm, _ = snap(sm, pal); sm[..., 3] = 255
    return sm, n
for name, (c, r, crop) in {"t_basalt": (0, 1, None), "t_brick": (0, 2, None), "t_glyph": (1, 2, None), "t_darkbrick": (2, 2, None),
                           "t_dirt": (3, 2, None), "t_ivy": (0, 3, None), "t_mossrock": (1, 1, (0, 0, 52, 15))}.items():
    tex, _ = nat_tex(c, r, crop) if crop is None else (None, None)
    if crop is not None:
        n = native(rcell(c, r), 6.56); n[..., 3] = 255
        top = n[0:16]; top = np.concatenate([top, top[::-1]], 0)       # mossy cap, mirrored to a 32 tall tile
        pal = palette_of(n, 40); sq = top[:32, 10:42].copy(); sm = seamless(sq); sm, _ = snap(sm, pal); sm[..., 3] = 255; tex = sm
    put(name, tex)
# cliff face: the rock-and-moss front of a ledge (lower part of the mossy cliff cell), tiles horizontally
cf = native(rcell(1, 1), 6.56); cf[..., 3] = 255
face = cf[14:38, 0:48].copy()
L_ = face[..., :3].mean(2)
put("t_cliffface", face)
# stairs (tile vertically), rope bridge (tile horizontally)
st = native(rcell(1, 0), 6.56); st[..., 3] = 255; put("t_stairs", st[:, 6:46].copy())
br = native(rcell(0, 0), 6.56); br = key_flood(br, lambda q: q[..., :3].max(2) < 40); put("p_bridge", trim(br))
# props
def prop(c, r, scale=1.0, crop=None):
    n = native(rcell(c, r), 6.56)
    if crop: n = n[crop[1]:crop[3], crop[0]:crop[2]]
    n = key_flood(n, lambda q: q[..., :3].max(2) < 40)
    n = trim(keep_component(n, _largest(n))) if crop is None else trim(n)
    if scale != 1.0: n = upscale(n, scale)
    return selout(n)
put("p_arch", prop(3, 1, 1.4))
put("p_brazier", prop(1, 3))
put("p_crystals", prop(2, 3, 1.0, (0, 0, 30, 40)))
put("p_crystals_s", prop(2, 3, 1.0, (28, 0, 52, 40)))
put("p_rubble", prop(3, 3, 1.0))
put("p_scaffold", prop(3, 0, 1.0, (0, 12, 26, 37)))

print("enemies (docs/ref_1059.png)")
EN = load("ref_1059.png")
def enemy(box, size, colors=28):
    x0, y0, x1, y1 = box
    reg = EN[y0:y1, x0:x1].copy()
    bgp = lambda q: (q[..., :3].max(2) < 105) & (q[..., 2] >= q[..., 0] - 6) & ((q[..., :3].max(2) - q[..., :3].min(2)) < 40)
    reg = key_flood(reg, bgp)
    reg = trim(largest_parts(reg, 40))
    h0, w0 = reg.shape[:2]
    if size[0] is None: size = (max(1, round(w0 * size[1] / h0)), size[1])
    img = crisp(reg, size, colors, sharpen=True)
    return selout(trim(img))
put("e_gecko", enemy((5, 400, 275, 548), (None, 21)))
put("e_vine", enemy((288, 318, 550, 570), (None, 34)))
put("e_tikispear", enemy((895, 300, 1045, 570), (None, 32)))
put("e_tikidart", enemy((1178, 330, 1380, 570), (None, 29)))
put("e_wisp_ref", enemy((596, 336, 830, 546), (None, 26), 24))

# taro: the single plant is the user's whole image too (exactly that art)
tree_windy("plant_taro_a", taro_sprite(TN, 84), "base", 3.6, 1.0, seed=6)

KEEP_PREFIX = ("t_", "p_", "e_", "tex_water", "tex_sand", "tex_grass", "tex_rock", "tex_glyph", "flora_", "plant_", "bush_", "tree_grove", "crown_", "trunk_a")
assets = {k: v for k, v in assets.items() if k.startswith(KEEP_PREFIX)}
meta = {k: v for k, v in meta.items() if k.startswith(KEEP_PREFIX)}
with open(os.path.join(ROOT, "js", "assets_data.js"), "w") as fh:
    fh.write("// Generated by tools/build_assets.py, do not edit by hand.\n")
    fh.write("window.ASSET_DATA = " + json.dumps(assets, indent=0) + ";\n")
    fh.write("window.ASSET_META = " + json.dumps(meta) + ";\n")
print("wrote js/assets_data.js")
