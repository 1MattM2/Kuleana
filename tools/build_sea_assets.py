"""
Kuleana: art for the Archipelago (Zone 2), cut from the user's concept sheets in assets/:
  - sea_flora_concepts.png : pebbled sand, basalt flagstones and coral rock textures; coral, tube sponge,
                             seagrass and brain coral sprites
  - Sea_enemies_concept.png: the tiki brute, the stingray, the crab and the pueo (the storm ray is drawn
                             in game from many small ray silhouettes, after the concept)
The concept art is high resolution; every piece is brought down to the game's pixel scale with the same
helpers as tools/build_assets.py (crisp downsample + palette snap, seamless textures, sel-out outline).

Writes assets/sea_*.png (for inspection) and js/assets_sea.js (merged into window.ASSET_DATA at load).
Run:  python3 tools/build_sea_assets.py
"""
import ast, base64, io, json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "assets")

# borrow the pixel-art helpers from build_assets.py without running its build
tree = ast.parse(open(os.path.join(HERE, "build_assets.py")).read())
helpers = ast.Module(body=[n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.Import, ast.ImportFrom))], type_ignores=[])
G = {"__name__": "helpers"}
exec(compile(helpers, "build_assets_helpers", "exec"), G)
crisp, texture, key_flood, trim, largest_parts, selout = G["crisp"], G["texture"], G["key_flood"], G["trim"], G["largest_parts"], G["selout"]

def load(fn):
    return np.array(Image.open(os.path.join(SRC, fn)).convert("RGBA")).astype(np.int32)

out = {}
def put(name, a):
    im = Image.fromarray(a.astype(np.uint8))
    im.save(os.path.join(SRC, "sea_" + name + ".png"))
    buf = io.BytesIO(); im.save(buf, "PNG", optimize=True)
    out[name] = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    print(f"  {name:18s} {a.shape[1]}x{a.shape[0]}")

FL = load("sea_flora_concepts.png")
print("textures")
# 64px tiles, so a flagstone or a pebble keeps its shape at the game's scale
put("tex_pebble", texture(FL[40:300, 22:212].copy(), (64, 64), 24))
put("tex_basalt", texture(FL[40:300, 248:448].copy(), (64, 64), 16))
coral = texture(FL[150:380, 478:690].copy(), (64, 64), 18)
put("tex_coralrock", coral)
# the atolls' pink coral: the same coral rock, its tones mapped onto the brain coral's rose ramp
ROSE = np.array([[92, 38, 58], [140, 58, 84], [186, 84, 110], [218, 118, 136], [238, 160, 166], [250, 204, 196]], float)
lum = coral[..., :3].astype(float) @ np.array([0.3, 0.59, 0.11])
lo, hi = np.percentile(lum, 3), np.percentile(lum, 97)
u = np.clip((lum - lo) / (hi - lo), 0, 1) * (len(ROSE) - 1)
i0 = np.floor(u).astype(int).clip(0, len(ROSE) - 2); f = (u - i0)[..., None]
pink = coral.copy(); pink[..., :3] = np.round(ROSE[i0] * (1 - f) + ROSE[i0 + 1] * f).astype(np.int32)
put("tex_pinkcoral", pink)
# two more atoll grounds, from their own concepts: bleached dead coral, and a living reef in every colour
DEAD = load("atoll_tile_concept.png"); LIVE = load("atoll_tile_2_concept.png")
put("tex_coraldead", texture(DEAD[24:-24, 24:-24].copy(), (64, 64), 14))
put("tex_corallive", texture(LIVE[24:-24, 24:-24].copy(), (64, 64), 22))

# the flora sit on a blue-grey grid: key it away from the edges in
def grid_bg(q):
    r, g, b = q[..., 0], q[..., 1], q[..., 2]
    return (b > r + 8) & (b - g < 30) & (q[..., :3].max(2) < 125) & ((q[..., :3].max(2) - q[..., :3].min(2)) < 42)
def cut(src, box, height, colors=30):
    x0, y0, x1, y1 = box
    reg = src[y0:y1, x0:x1].copy()
    reg = key_flood(reg, grid_bg)
    reg = trim(largest_parts(reg, 60))
    h0, w0 = reg.shape[:2]
    size = (max(1, round(w0 * height / h0)), height)
    return selout(trim(crisp(reg, size, colors, sharpen=True)))
print("flora")
put("f_coralmix", cut(FL, (20, 465, 245, 675), 22, 36))
put("f_sponges", cut(FL, (265, 475, 455, 675), 22, 18))
put("f_seagrass", cut(FL, (460, 430, 698, 695), 24, 16))
put("f_brain", cut(FL, (55, 775, 205, 895), 11, 14))
put("f_sponge", cut(FL, (290, 745, 425, 920), 16, 14))
put("f_grass1", cut(FL, (520, 705, 650, 955), 20, 12))

EN = load("Sea_enemies_concept.png")
def dark_bg(q):
    m = q[..., :3].max(2)
    return (m < 30) | ((m < 95) & ((q[..., :3].max(2) - q[..., :3].min(2)) < 16))
def ecut(box, height, colors=30, pred=dark_bg, keep=80):
    x0, y0, x1, y1 = box
    reg = EN[y0:y1, x0:x1].copy()
    reg = key_flood(reg, pred)
    reg = trim(largest_parts(reg, keep))
    h0, w0 = reg.shape[:2]
    size = (max(1, round(w0 * height / h0)), height)
    return selout(trim(crisp(reg, size, colors, sharpen=True)))
print("creatures")
put("e_brute", ecut((48, 44, 512, 512), 58, 40))
# the brute's animation sheet (Brute_concept_animation.webp): a 6x3 grid of frames. Row 1 the walk, row 2 the
# double-fist slam, row 3 a punch and a ground smash. Each frame is cut on a fixed box anchored at the
# feet (so they line up), the navy ground and grid keyed out, and brought down to the game's scale.
from collections import deque

from PIL import ImageFilter
BRUTE_PAL = None
def clean_frame(box, OW, OH):
    """Concept frame -> clean game sprite: the compression noise smoothed away, the silhouette thickened a
    touch so thin wrists and joints survive the shrink, every colour snapped to the clean brute sprite's own
    palette, stray specks dropped, gaps filled and a uniform dark outline round it all."""
    global BRUTE_PAL
    if BRUTE_PAL is None:
        bs = np.array(Image.open(os.path.join(SRC, "sea_e_brute.png")).convert("RGBA")).astype(np.int32)
        cols = bs[bs[..., 3] > 0][:, :3]
        BRUTE_PAL = np.unique(cols, axis=0)
    im = Image.fromarray(box.astype(np.uint8), "RGBA")
    rgb = im.convert("RGB").filter(ImageFilter.MedianFilter(3))
    al = im.getchannel("A").point(lambda v: 255 if v > 0 else 0).filter(ImageFilter.MaxFilter(3))
    # the colour under newly grown edge pixels: the nearest real pixel's
    src_rgb = np.array(rgb).astype(np.int32); a0 = np.array(im.getchannel("A")) > 0; a1 = np.array(al) > 0
    grow = a1 & ~a0
    have = a0.copy()
    for _ in range(4):                                   # spread real colours outward a pixel at a time
        if not (grow & ~have).any(): break
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sh = np.roll(have, (dy, dx), (0, 1)); shc = np.roll(src_rgb, (dy, dx), (0, 1))
            take = grow & ~have & sh
            src_rgb[take] = shc[take]; have = have | take
    H0, W0 = a1.shape; fy, fx = H0 / OH, W0 / OW
    out = np.zeros((OH, OW, 4), np.int32)
    for y in range(OH):
        for x in range(OW):
            y0, y1, x0, x1 = int(y * fy), int((y + 1) * fy), int(x * fx), int((x + 1) * fx)
            m = a1[y0:y1, x0:x1]
            if m.mean() < 0.42: continue
            blk = src_rgb[y0:y1, x0:x1][m]
            # the block's most common colour (crisp, keeps the carving's contrast) rather than its median
            q = (blk // 12) * 12; keys, cnt = np.unique(q, axis=0, return_counts=True); best = keys[cnt.argmax()]
            c = blk[(np.abs(q - best).sum(1) == 0)].mean(0)
            out[y, x, :3] = c; out[y, x, 3] = 255
    # snap to the brute's palette (by brightness-weighted distance)
    op = out[..., 3] > 0
    px_ = out[op][:, :3]
    dd = ((px_[:, None, :] - BRUTE_PAL[None, :, :]) ** 2 * np.array([3, 4, 2])).sum(2)
    out[op, :3] = BRUTE_PAL[dd.argmin(1)]
    # drop specks of fewer than 4 pixels, fill enclosed gaps
    op = out[..., 3] > 0; seen = np.zeros_like(op)
    for y in range(OH):
        for x in range(OW):
            if not op[y, x] or seen[y, x]: continue
            comp = [(y, x)]; seen[y, x] = True; q = deque([(y, x)])
            while q:
                cy, cx = q.popleft()
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    yy, xx = cy + dy, cx + dx
                    if 0 <= yy < OH and 0 <= xx < OW and op[yy, xx] and not seen[yy, xx]: seen[yy, xx] = True; q.append((yy, xx)); comp.append((yy, xx))
            if len(comp) < 4:
                for (yy, xx) in comp: out[yy, xx] = 0
    op = out[..., 3] > 0; outside = np.zeros_like(op); q = deque()
    for y in range(OH):
        for x in range(OW):
            if (y in (0, OH - 1) or x in (0, OW - 1)) and not op[y, x]: outside[y, x] = True; q.append((y, x))
    while q:
        cy, cx = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = cy + dy, cx + dx
            if 0 <= yy < OH and 0 <= xx < OW and not op[yy, xx] and not outside[yy, xx]: outside[yy, xx] = True; q.append((yy, xx))
    filled = ~op & ~outside
    DARK = BRUTE_PAL[((BRUTE_PAL).sum(1)).argmin()]
    out[filled, :3] = DARK; out[filled, 3] = 255
    # a uniform 1px outline in the sprite's darkest colour
    # sel-out: the outermost pixels of the figure darkened to a deep tint of their own colour (no added ring)
    op = out[..., 3] > 0; pad_ = np.pad(op, 1)
    rim = op & ~(pad_[:-2, 1:-1] & pad_[2:, 1:-1] & pad_[1:-1, :-2] & pad_[1:-1, 2:])
    out[rim, :3] = (out[rim, :3] * 0.45 + DARK * 0.3).astype(np.int32)
    return out

def brute_anim():
    src = np.array(Image.open(os.path.join(SRC, "Brute_concept_animation.webp")).convert("RGBA")).astype(np.int32)
    r, g, b = src[..., 0], src[..., 1], src[..., 2]
    # the navy ground: only where it is connected to the open background (dark shading inside his body stays)
    near = (b >= r) & (src[..., :3].max(2) < 80)
    bgm = np.zeros_like(near); q = deque()
    H0, W0 = near.shape
    for x in range(W0):
        for y in (0, H0 - 1):
            if near[y, x] and not bgm[y, x]: bgm[y, x] = True; q.append((y, x))
    for y in range(H0):
        for x in (0, W0 - 1):
            if near[y, x] and not bgm[y, x]: bgm[y, x] = True; q.append((y, x))
    # (the grid lines split the sheet: seed from them too)
    for gx in [int(i * 1376 / 6) for i in range(1, 6)]:
        for y in range(H0):
            for x in range(max(0, gx - 3), min(W0, gx + 3)):
                if near[y, x] and not bgm[y, x]: bgm[y, x] = True; q.append((y, x))
    for gy in (246, 512):
        for x in range(W0):
            for y in range(gy - 3, gy + 3):
                if near[y, x] and not bgm[y, x]: bgm[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < H0 and 0 <= xx < W0 and near[yy, xx] and not bgm[yy, xx]: bgm[yy, xx] = True; q.append((yy, xx))
    src[bgm, 3] = 0
    cw, rows = 1376 / 6, [(0, 244), (250, 510), (518, 768)]   # (clear of the grid lines between rows)
    BW, BH, OW, OH = 236, 266, 70, 79   # (room for raised fists and swung arms: nothing cut off)
    frames = []
    for ri, (y0, y1) in enumerate(rows):
        for ci in range(6):
            x0, x1 = int(ci * cw) + 3, int((ci + 1) * cw) - 3
            cell = ~bgm[y0:y1, x0:x1]
            if cell.sum() < 2000: continue                                 # the empty cell
            ys = np.where(cell.sum(1) > 6)[0]; feet = y0 + ys.max()
            # centre each frame on its body (the head and chest band), not on the cell, so the figure
            # doesn't jitter sideways from frame to frame
            ys2 = np.where(cell.any(1))[0]; band = cell[ys2.min() + 10:ys2.min() + 90]
            bx = np.where(band.any(0))[0]
            cols_w = band.sum(0); cx = x0 + int(round((np.arange(len(cols_w)) * cols_w).sum() / max(1, cols_w.sum())))
            box = np.zeros((BH, BW, 4), np.int32)
            sy0, sx0 = feet + 4 - BH, cx - BW // 2
            ys0, xs0 = max(0, sy0), max(0, sx0); ys1, xs1 = min(src.shape[0], sy0 + BH), min(src.shape[1], sx0 + BW)
            box[ys0 - sy0:ys1 - sy0, xs0 - sx0:xs1 - sx0] = src[ys0:ys1, xs0:xs1]
            # keep only this cell's pixels (no neighbours' fists)
            mx = np.zeros_like(box[..., 3]); mx[max(0, y0 - sy0):max(0, min(BH, y1 - sy0)), max(0, x0 - sx0):max(0, min(BW, x1 - sx0))] = 1; box[..., 3] *= mx   # (this cell only: no neighbours' fists)
            box[box[..., 3] == 0] = 0
            d = clean_frame(box, OW, OH)
            frames.append(d.astype(np.uint8))
    sheet = np.concatenate(frames, axis=1)
    print("  brute anim frames", len(frames))
    return sheet
put("e_brute_anim", brute_anim())
put("e_ray", ecut((604, 48, 772, 222), 22, 12))
put("e_crab", ecut((864, 48, 1032, 222), 16, 20))
put("e_owl", ecut((588, 328, 772, 512), 26, 28))

with open(os.path.join(ROOT, "js", "assets_sea.js"), "w") as fh:
    fh.write("// Generated by tools/build_sea_assets.py from the concept sheets in assets/. Do not edit by hand.\n")
    fh.write("Object.assign(window.ASSET_DATA, " + json.dumps(out, indent=0) + ");\n")
print("wrote js/assets_sea.js")
