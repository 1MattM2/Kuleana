"""
Kuleana, Zone 2 (the Archipelago): the three level maps. Writes js/zone2.js.

Legend: ~ deep (the edge of the world)  - medium water (wade slowly)  _ shallow  : sand  , grass  . soil
        c pink coral rock  b basalt flagstones  # cliff  S stairs  % paving

Level design notes (what each level is for, and how it paces itself):
  1. THE OUTER ISLES - a wide, open level for exploring. Creatures live in pockets (a lone crab on the
     landing beach to learn on, a crab pack in the cove, a tiki camp in the village, rays in the east
     shallows) that you can take on, slip past or come back to. Only two fights shut the doors: the
     FEEDING FRENZY out on the Blue Road (open water: a great school of fish arrives and the sharks
     follow it in; survive 45 seconds) and THE HEADLAND at the end.
  2. THE CORAL ATOLLS - rings of pink coral round lagoons. Between them, reef flats and coral gardens
     (rays, sharks, wandering crabs); in each atoll a boxed-in fight. The giant spider crab holds the
     island in the middle of the last and biggest atoll.
  3. THE THERMAL CLIFFS - a journey east along the foot of basalt cliffs: the beach, the steaming
     shallows (thermal sharks among the vents), up the stairs onto the clifftop where the pueo roost
     (a whole flock that bombs and swoops together), down again past a tiki camp, the Boiling Bay, and
     at the end a lagoon with no land in it at all, where the Storm Ray waits.
Every level mixes its grounds (plain and pebbled sand, grass, coral, basalt, three depths of water,
seagrass meadows and coral gardens under the surface) so no stretch looks like the last.

Run:  python3 tools/zone2gen.py
"""
import json, math, os, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def grid(w, h, ch='~'): return [[ch] * w for _ in range(h)]
def ell(x, y, cx, cy, rx, ry, ph):
    a = math.atan2(y - cy, x - cx); k = 1 + 0.12 * math.sin(3 * a + ph) + 0.07 * math.sin(5 * a + ph * 2)
    return math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2) / k
def segd(px, py, a, b):
    (x1, y1), (x2, y2) = a, b; dx, dy = x2 - x1, y2 - y1; l = dx * dx + dy * dy or 1
    t = max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / l)); return math.hypot(x1 + dx * t - px, y1 + dy * t - py)
def border(g, ch='~'):
    H = len(g); W = len(g[0])
    for y in range(H):
        for x in range(W):
            if x < 2 or y < 2 or x >= W - 2 or y >= H - 2: g[y][x] = ch
def depths(g, land='.,:%cbS#', shallow=2.4, medium=6.5, keep=()):
    """Water by distance from land: shallows hug the shore, then the reef's medium water, then deep."""
    H = len(g); W = len(g[0])
    lands = [(x, y) for y in range(H) for x in range(W) if g[y][x] in land]
    from collections import deque
    dist = [[1e9] * W for _ in range(H)]; q = deque()
    for (x, y) in lands: dist[y][x] = 0; q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H:
                nd = dist[y][x] + (1.414 if dx and dy else 1)
                if nd < dist[ny][nx]: dist[ny][nx] = nd; q.append((nx, ny))
    for y in range(H):
        for x in range(W):
            if g[y][x] in land or (x, y) in keep: continue
            if g[y][x] in '_-' and g[y][x] != '~': continue          # painted water stays as painted
            d = dist[y][x] + 0.6 * math.sin(x * 0.37 + y * 0.21)
            g[y][x] = '_' if d < shallow else '-' if d < medium else '~'
def island(g, cx, cy, rx, ry, ph, grass=0.0, ch=':', core=','):
    for y in range(len(g)):
        for x in range(len(g[0])):
            e = ell(x + .5, y + .5, cx, cy, rx, ry, ph)
            if e <= 1: g[y][x] = core if (grass and e < grass) else ch
def bar(g, a, b, w, ch='_', over='~-'):
    for y in range(len(g)):
        for x in range(len(g[0])):
            if segd(x + .5, y + .5, a, b) < w and g[y][x] in over: g[y][x] = ch
def blob(g, cx, cy, rx, ry, ch, over, ph=0.0):
    for y in range(len(g)):
        for x in range(len(g[0])):
            if ell(x + .5, y + .5, cx, cy, rx, ry, ph) <= 1 and g[y][x] in over: g[y][x] = ch
def atoll(g, cx, cy, rx, ry, ring, ph, gaps, lagoon='_', sand=0.35):
    """A ring of pink coral round a lagoon, broken by channels; sand drifts on the ring here and there."""
    for y in range(len(g)):
        for x in range(len(g[0])):
            e = ell(x + .5, y + .5, cx, cy, rx, ry, ph)
            if e > 1: continue
            a = math.atan2(y + .5 - cy, x + .5 - cx)
            gap = any(abs(math.atan2(math.sin(a - ga), math.cos(a - ga))) < gw for ga, gw in gaps)
            if e > 1 - ring / min(rx, ry) and not gap:
                g[y][x] = ':' if math.sin(a * 3 + ph * 2) > 1 - sand * 2 and e < 1 - ring * 0.3 / min(rx, ry) else 'c'
            else: g[y][x] = lagoon if e < 0.98 or not gap else '_'
def props_on(g, kinds, n, seed, avoid, mind=1.7, cells=',:', ring=1):
    r = random.Random(seed); out = []; H = len(g); W = len(g[0]); tries = 0
    while len(out) < n and tries < n * 90:
        tries += 1; x = r.uniform(2, W - 3); y = r.uniform(2, H - 3); tx = int(x); ty = int(y)
        if not all(g[ty + dy][tx + dx] in cells for dy in range(-ring, ring + 1) for dx in range(-ring, ring + 1)): continue
        if any(math.hypot(x - a[0], y - a[1]) < a[2] for a in avoid): continue
        if any(math.hypot(x - p['x'], y - p['y']) < mind for p in out): continue
        k = r.choices([k for k, _ in kinds], [w for _, w in kinds])[0]
        p = {'k': k, 'x': round(x, 1), 'y': round(y, 1)}
        if k == 'boulder': p['s'] = r.randint(1, 2)
        out.append(p)
    return out
E = lambda e, x, y, **k: dict(e=e, x=x, y=y, **k)
OUT = {}
UNDER = [('seagrass', 6), ('coralmix', 2), ('sponge', 2), ('brain', 1)]

# ======================================================================= Level 1: The Outer Isles
W, H = 150, 84; g = grid(W, H)
island(g, 17, 63, 12, 8.5, 0.4, 0.45)                 # A: the landing isle
island(g, 52, 60, 13, 9, 1.3, 0.5)                    # B: the village isle
island(g, 33, 34, 9, 6.5, 2.1, 0.0)                   # C: the pebble cove (north of the landing)
island(g, 118, 26, 18, 12, 0.7, 0.55)                 # E: the headland
island(g, 138, 62, 7, 5, 2.6, 0.0)                    # F: the east islet
island(g, 80, 44, 3.2, 2.2, 1.0, 0.0)                 #    a sandbar islet out on the Blue Road
island(g, 70, 18, 5, 3.5, 0.2, 0.3)                   #    a palm islet north of the road
depths(g)
bar(g, (27, 62), (41, 60), 1.6)                       # A -> B sandbar
bar(g, (18, 54), (28, 40), 1.4)                       # A -> C
bar(g, (64, 56), (100, 38), 7.5, '_', '~-')           # the Blue Road: a broad sweep of shallows...
bar(g, (66, 52), (98, 34), 3.0, '-', '_~')            # ...with a deeper channel down its middle
bar(g, (100, 38), (106, 34), 2.2)                     # the road comes ashore on the headland
bar(g, (122, 38), (136, 56), 1.5)                     # headland -> east islet
bar(g, (72, 22), (84, 30), 1.2)                       # palm islet -> the road
for (x, y) in [(76, 40), (90, 44), (86, 34)]: blob(g, x, y, 2.4, 1.8, '~', '-_')     # holes the sharks rise from
bar(g, (31, 61), (34, 61), 1.4, '-', '_')             # a shark channel across the first sandbar
for y in range(55, 62):                               # the tiki camp's paved court
    for x in range(46, 58):
        if g[y][x] in ',:' and abs(x - 52) + abs(y - 58) * 1.3 < 7: g[y][x] = '%'
border(g)
avoid = [(17, 63, 3), (17, 57, 3), (52, 58, 5), (128, 15, 4), (118, 22, 9), (33, 34, 3)]
p = props_on(g, [('palm', 6), ('naupaka', 5), ('tidepool', 2), ('driftwood', 2), ('boulder', 1), ('fern', 1)], 120, 11, avoid, 1.9)
p += props_on(g, UNDER, 150, 13, [], 1.6, cells='_', ring=0)
p += props_on(g, [('coral', 1)], 40, 12, [], 2.2, cells='-', ring=0)
p += [{'k': 'gate', 'x': 17, 'y': 56.2}, {'k': 'gate', 'x': 128, 'y': 13.6}, {'k': 'tiki', 'x': 13.5, 'y': 57.4}, {'k': 'tiki', 'x': 20.5, 'y': 57.4},
      {'k': 'tiki', 'x': 47.4, 'y': 54.6}, {'k': 'tiki', 'x': 56.6, 'y': 54.6}, {'k': 'brazier', 'x': 48.6, 'y': 61.2}, {'k': 'brazier', 'x': 55.4, 'y': 61.2},
      {'k': 'column', 'x': 52, 'y': 53.4}, {'k': 'brazier', 'x': 125, 'y': 14.4}, {'k': 'brazier', 'x': 131, 'y': 14.4}]
OUT['isles'] = dict(map=[''.join(r) for r in g], props=p, spawn=dict(x=17, y=65), fish=4,
  enemies=[
    E('crab', 25, 66),                                                                   # the lone crab: learn on it
    E('shark', 32.5, 61),                                                                # the shark channel: strike it from the water
    E('crab', 30, 33, tribe=11), E('crab', 35, 36, tribe=11), E('crab', 37, 32, tribe=11), E('spitcrab', 33, 31, tribe=11),   # the cove's pack
    E('spear', 49, 57, tribe=12), E('spear', 55, 57, tribe=12), E('dart', 52, 55, tribe=12), E('crab', 45, 63, tribe=12),     # the village camp
    E('brute', 52, 59, tribe=12),
    E('shark', 44, 70), E('ray', 61, 66),
    E('crab', 104, 38, tribe=13), E('crab', 108, 40, tribe=13), E('spitcrab', 110, 37, tribe=13),                             # crabs on the headland beach
    E('spear', 120, 34, tribe=14), E('dart', 124, 33, tribe=14), E('spear', 116, 36, tribe=14),                               # the headland's lower camp
    E('ray', 128, 46), E('ray', 133, 52), E('shark', 128, 54),                                                                # the east shallows
    E('crab', 137, 61, tribe=15), E('spitcrab', 140, 63, tribe=15), E('crab', 135, 64, tribe=15),                             # the east islet
    E('shark', 68, 24), E('crab', 70, 18)],
  arenas=[
    dict(title="THE FEEDING FRENZY", sub="A great school runs the Blue Road. The sharks follow. Survive.", rect=[66, 31, 97, 55], survive=45, frenzy=1, waves=[[]]),
    dict(title="THE HEADLAND", rect=[110, 6, 134, 22], unlocks='reef', reward='leiomano',
         waves=[[E('brute', 118, 13, tribe=21), E('spear', 126, 11, tribe=21), E('spear', 128, 15, tribe=21), E('dart', 114, 10, tribe=21), E('crab', 122, 18, enter='burst')],
                [E('brute', 126, 12, tribe=22), E('brute', 116, 16, tribe=22), E('dart', 121, 10, tribe=22), E('spitcrab', 121, 19, enter='scurry'), E('crab', 113, 14, enter='burst'), E('crab', 131, 17, enter='burst')]])],
  gates=[dict(x=17, y=57.4, to='sanctum'), dict(x=128, y=14.8, to='sanctum')])

# ======================================================================= Level 2: The Coral Atolls
W, H = 140, 96; g = grid(W, H)
island(g, 14, 80, 8, 6, 0.5, 0.5)                     # the landing isle
depths(g, shallow=2.2, medium=8)
# reef flats: broad medium water joining the atolls, and shallow coral gardens along them
for (a, b, w, ch) in [((20, 78), (38, 70), 6, '-'), ((38, 70), (70, 78), 6, '-'), ((38, 70), (60, 44), 6, '-'), ((70, 78), (96, 58), 6, '-'), ((60, 44), (96, 58), 6, '-'), ((96, 58), (112, 26), 7, '-'), ((60, 44), (112, 26), 5, '-'),
                      ((24, 74), (34, 66), 3, '_'), ((48, 82), (62, 80), 3, '_'), ((50, 56), (56, 48), 2.5, '_'), ((82, 66), (90, 62), 3, '_'), ((74, 40), (96, 34), 2.6, '_')]:
    bar(g, a, b, w, ch, '~' if ch == '-' else '~-')
atoll(g, 38, 70, 11, 9, 2.4, 0.3, [(math.pi, 0.3), (-math.pi / 2 + 0.4, 0.3)])                     # 1: lagoon of stings
atoll(g, 70, 78, 10, 8, 2.2, 1.1, [(math.pi * 0.95, 0.3), (-math.pi / 2, 0.3)])                     # 2: the broken ring
atoll(g, 60, 44, 12, 10, 2.4, 2.0, [(math.pi / 2 + 0.3, 0.28), (-0.3, 0.28)], lagoon='_')            # 3: the garden atoll
atoll(g, 96, 58, 10, 8.5, 2.2, 0.6, [(math.pi, 0.3), (-math.pi / 2 - 0.3, 0.3)], lagoon='-')         # 4: the blue hole
atoll(g, 112, 26, 19, 15, 2.8, 0.9, [(math.pi * 0.8, 0.22), (math.pi * 0.35, 0.2)])                   # 5: the great atoll
blob(g, 96, 58, 4, 3, '~', '-_')                                                                     # the blue hole itself
blob(g, 112, 26, 9, 6.5, 'c', '_-', 0.4)                                                             # the spider crab's island
blob(g, 112, 25, 6, 4, ':', 'c', 1.2)
for (x, y) in [(108, 22), (117, 29), (106, 29)]: blob(g, x, y, 1.6, 1.2, '_', 'c:')                 # tide pools in the island
border(g)
avoid = [(14, 80, 3), (14, 75, 3), (112, 26, 8), (113, 9, 3)]
p = props_on(g, [('palm', 5), ('naupaka', 4), ('driftwood', 1)], 40, 21, avoid, 1.8, cells=':')
p += props_on(g, [('naupaka', 2), ('tidepool', 2)], 30, 26, avoid, 2.2, cells='c', ring=0)
p += props_on(g, [('coralmix', 5), ('brain', 3), ('sponge', 3), ('seagrass', 3)], 230, 22, [], 1.4, cells='_', ring=0)
p += props_on(g, [('coral', 1)], 110, 23, [], 1.6, cells='-', ring=0)
p += props_on(g, [('seastack', 1)], 6, 24, [(112, 26, 21), (38, 70, 12), (70, 78, 11), (60, 44, 13), (96, 58, 11)], 7, cells='-~', ring=1)
p += [{'k': 'gate', 'x': 14, 'y': 75.2}, {'k': 'tiki', 'x': 10.6, 'y': 76.4}, {'k': 'tiki', 'x': 17.4, 'y': 76.4}]
OUT['reef'] = dict(map=[''.join(r) for r in g], props=p, spawn=dict(x=14, y=82), fish=5, pebbles=0.6,
  enemies=[E('ray', 26, 76), E('crab', 21, 82), E('shark', 30, 82), E('ray', 52, 74), E('shark', 54, 66), E('crab', 47, 60, tribe=31), E('crab', 50, 62, tribe=31), E('spitcrab', 52, 58, tribe=31),
           E('ray', 76, 64), E('ray', 84, 70), E('shark', 82, 50), E('ray', 74, 36), E('shark', 86, 40), E('crab', 92, 46, tribe=32), E('spitcrab', 96, 44, tribe=32), E('crab', 94, 48, tribe=32),
           E('ray', 84, 76), E('shark', 104, 46), E('bigshark', 76, 56)],
  arenas=[
    dict(title="THE LAGOON OF STINGS", rect=[29, 63, 47, 77],
         waves=[[E('ray', 35, 68), E('ray', 41, 72), E('crab', 36, 73, enter='burst', tribe=41), E('crab', 40, 66, enter='burst', tribe=41), E('crab', 33, 70, enter='burst', tribe=41)],
                [E('ray', 36, 70), E('ray', 40, 69), E('spear', 34, 66, tribe=42), E('spear', 42, 73, tribe=42), E('dart', 38, 74, tribe=42)]]),
    dict(title="THE BROKEN RING", rect=[62, 72, 78, 84],
         waves=[[E('brute', 70, 78, tribe=43), E('spear', 66, 76, tribe=43), E('spear', 74, 80, tribe=43), E('crab', 67, 81, enter='burst'), E('crab', 73, 75, enter='burst')],
                [E('brute', 67, 77, tribe=44), E('brute', 73, 79, tribe=44), E('spitcrab', 70, 82, enter='scurry')]]),
    dict(title="THE CORAL GARDEN", rect=[50, 36, 70, 52],
         waves=[[E('crab', 56, 42, enter='burst', tribe=45), E('crab', 64, 42, enter='burst', tribe=45), E('crab', 60, 48, enter='burst', tribe=45), E('spitcrab', 60, 40, enter='scurry', tribe=45), E('spitcrab', 56, 47, enter='scurry', tribe=45)],
                [E('ray', 58, 44), E('ray', 62, 46), E('brute', 60, 43, tribe=46), E('crab', 55, 45, enter='burst', tribe=47), E('crab', 65, 45, enter='burst', tribe=47)],
                [E('spear', 56, 41, tribe=48), E('spear', 64, 47, tribe=48), E('dart', 60, 49, tribe=48), E('crab', 62, 40, enter='burst', tribe=49), E('crab', 57, 48, enter='burst', tribe=49), E('crab', 64, 43, enter='burst', tribe=49)]]),
    dict(title="THE BLUE HOLE", rect=[88, 51, 104, 65],
         waves=[[E('shark', 92, 55), E('shark', 100, 61), E('ray', 93, 61), E('ray', 99, 54)],
                [E('bigshark', 96, 62), E('shark', 91, 58), E('ray', 101, 58), E('spitcrab', 96, 52, enter='scurry')]]),
    dict(title="PĀPAʻI-LOA", sub="The giant spider crab", rect=[95, 13, 129, 39], unlocks='vents', reward='armor:lauhala',
         waves=[[E('spidercrab', 112, 25, enter='scurry')]])],
  gates=[dict(x=14, y=76.4, to='sanctum')])

# ======================================================================= Level 3: The Thermal Cliffs
W, H = 232, 58; g = grid(W, H)
# the cliffs' foot wanders along the north; coves cut back into it, and in two places the land rises
# to a clifftop you can climb onto (the roost, and the lookout)
foot = [16 + int(2.5 * math.sin(x * 0.15) + 2 * math.sin(x * 0.055 + 1)) for x in range(W)]
for x in range(70, 114): foot[x] = 17 + int(1.5 * math.sin(x * 0.2))          # under the roost
for (a, b, d) in [(40, 50, 11), (140, 150, 12), (160, 176, 12)]:
    for x in range(a, b): foot[x] = min(foot[x], d + int(abs(x - (a + b) / 2) * 0.4))
for x in range(184, W): foot[x] = min(W, foot[x] + 0)
for y in range(H):
    for x in range(W):
        f = foot[x]
        if y < f: g[y][x] = '#'
        elif y < f + 3 + int(1.5 * math.sin(x * 0.3)): g[y][x] = ':'
        else: g[y][x] = '~'
# the clifftop roost: a plateau of basalt and grass, up the stairs at x 66, down again at x 112
for y in range(3, 15):
    for x in range(68, 114):
        if (x - 68) > 2 - y * 0.3 and (113 - x) > 1 + (y % 3) * 0.3:
            g[y][x] = 'b' if (math.sin(x * 0.23) + math.sin(y * 0.5 + x * 0.07)) > 0.2 else ','
for y in range(5, 18):
    for x in range(64, 67): g[y][x] = 'S'
for y in range(5, 18):
    for x in range(112, 115): g[y][x] = 'S'
for x in range(62, 70):
    for y in range(3, 6): g[y][x] = 'b'
for x in range(110, 116):
    for y in range(3, 6): g[y][x] = 'b'
# basalt shelves along the beach under the cliffs, as in the concept
for x in range(W):
    f = foot[x]
    if math.sin(x * 0.11 + 2) > 0.55 and g[f][x] == ':': g[f][x] = 'b'
    if math.sin(x * 0.11 + 2) > 0.8 and f + 1 < H and g[f + 1][x] == ':': g[f + 1][x] = 'b'
# sandy spits and islets, and the bays
for (cx, cy, rx, ry, ph) in [(22, 30, 4, 2.4, 0.4), (52, 31, 5, 2.6, 1.1), (126, 32, 4.5, 2.6, 2.0), (152, 34, 3.5, 2.2, 0.6)]:
    island(g, cx, cy, rx, ry, ph)
depths(g, land='.,:%cbS#', shallow=4.2, medium=10.5)
# the steaming shallows and the boiling bay: wide shallow benches of warm water for the vents
blob(g, 50, 28, 14, 7, '_', '-~', 0.3)
blob(g, 164, 30, 16, 9, '_', '-~', 1.2)
blob(g, 164, 31, 6, 4, '-', '_', 0.2)
# the Storm Ray's lagoon: no land in it at all, shallows and reef water in rings
for y in range(H):
    for x in range(186, W - 2):
        e = ell(x + .5, y + .5, 208, 32, 21, 16, 0.5)
        if e <= 1 and y >= foot[x] + 1: g[y][x] = '_' if e > 0.7 or e < 0.25 else '-'
for x in range(184, 190):
    for y in range(foot[x] + 1, foot[x] + 4): g[y][x] = '_'
# past the causeway the cliffs drop straight into the lagoon: not a strip of sand to stand on
for x in range(188, W):
    for y in range(foot[x], H):
        if g[y][x] in ':b': g[y][x] = '_'
border(g, '~')
for y in range(H):
    for x in range(W):
        if y < 2 and g[y][x] != '#': g[y][x] = '#'
vents = [(38, 26), (44, 30), (50, 25), (56, 29), (61, 26), (47, 33), (54, 33),
         (150, 28), (156, 33), (160, 26), (166, 34), (170, 27), (175, 31), (158, 37), (168, 22), (178, 25),
         (128, 26), (100, 28)]
for (x, y) in vents: g[y][x] = '_' if g[y][x] in ':b' else g[y][x]
avoid = [(6, foot[6] + 2, 3), (208, 32, 22), (227, foot[227] + 1, 3)] + [(x, y, 2.5) for (x, y) in vents]
p = props_on(g, [('palm', 3), ('naupaka', 5), ('tidepool', 4), ('driftwood', 2), ('boulder', 2)], 90, 31, avoid, 1.8, cells=':')
p += props_on(g, [('naupaka', 3), ('boulder', 2), ('fern', 3), ('palm', 1)], 30, 34, [(70, 5, 2), (112, 5, 2)], 2, cells=',b')
p += props_on(g, [('sponge', 3), ('seagrass', 4), ('coralmix', 1)], 120, 32, [(208, 32, 22)] + [(x, y, 2.5) for (x, y) in vents], 1.6, cells='_', ring=0)
p += props_on(g, [('coral', 1)], 24, 33, [(208, 32, 22)] + [(x, y, 2.5) for (x, y) in vents], 2.2, cells='-', ring=0)
p += [{'k': 'vent', 'x': x + 0.5, 'y': y + 0.5, 'vk': i % 3} for i, (x, y) in enumerate(vents)]
p += [{'k': 'gate', 'x': 6, 'y': foot[6] + 1.3}, {'k': 'gate', 'x': 182, 'y': foot[182] + 1.3}, {'k': 'brazier', 'x': 179.6, 'y': foot[180] + 1.4}, {'k': 'brazier', 'x': 184.4, 'y': foot[184] + 1.4}]
fy = lambda x, d=2: foot[x] + d
OUT['vents'] = dict(map=[''.join(r) for r in g], props=p, spawn=dict(x=6, y=foot[6] + 3), fish=3, ventRest=4.5,   # (walls: the island's obsidian cliffs with the jungle on top, as in Zone 1)
  enemies=[
    E('crab', 14, fy(14), tribe=51), E('crab', 18, fy(18), tribe=51), E('spitcrab', 16, fy(16, 3), tribe=51),                # the first beach
    E('ray', 26, 34), E('tshark', 40, 34), E('tshark', 58, 34), E('spear', 48, fy(48), tribe=52), E('dart', 52, fy(52), tribe=52),
    E('pueo', 74, 6, tribe=53), E('pueo', 82, 4, tribe=53), E('pueo', 90, 7, tribe=53),                                     # owls watching the stairs
    E('spear', 120, fy(120), tribe=54), E('brute', 124, fy(124, 3), tribe=54), E('dart', 128, fy(128), tribe=54),           # the camp under the lookout
    E('ray', 122, 36), E('ray', 132, 38), E('tshark', 136, 34), E('crab', 140, fy(140), tribe=55), E('crab', 144, fy(144), tribe=55),
    E('pueo', 146, fy(146, -3), tribe=56), E('pueo', 150, fy(150, -3), tribe=56)],
  arenas=[
    dict(title="THE STEAMING SHALLOWS", rect=[36, 18, 64, 38],
         waves=[[E('tshark', 44, 30), E('tshark', 56, 31), E('crab', 42, fy(42), enter='burst', tribe=61), E('crab', 58, fy(58), enter='burst', tribe=61)],
                [E('tshark', 50, 32), E('spear', 46, fy(46), tribe=62), E('spear', 54, fy(54), tribe=62), E('dart', 50, fy(50), tribe=62), E('ray', 40, 33)]]),
    dict(title="THE ROOST", sub="The pueo have seen you", rect=[70, 3, 110, 14],
         waves=[[E('pueo', 80, 4, tribe=63, enter='descend'), E('pueo', 88, 5, tribe=63, enter='descend'), E('pueo', 96, 4, tribe=63, enter='descend'), E('pueo', 104, 6, tribe=63, enter='descend'), E('spear', 90, 10, tribe=64)],
                [E('pueo', 76, 5, tribe=65, enter='descend'), E('pueo', 84, 4, tribe=65, enter='descend'), E('pueo', 92, 6, tribe=65, enter='descend'), E('pueo', 100, 4, tribe=65, enter='descend'), E('pueo', 106, 6, tribe=65, enter='descend'), E('brute', 92, 9, tribe=66)]]),
    dict(title="THE BOILING BAY", rect=[146, 16, 182, 42],
         waves=[[E('tshark', 156, 30), E('tshark', 170, 32), E('spitcrab', 152, fy(152), enter='scurry', tribe=67), E('crab', 160, fy(160), enter='burst', tribe=67), E('crab', 172, fy(172), enter='burst', tribe=67)],
                [E('tshark', 160, 34), E('tshark', 168, 28), E('bigshark', 164, 37), E('ray', 156, 35), E('ray', 174, 30)],
                [E('brute', 164, fy(164, 3), tribe=68), E('spear', 158, fy(158), tribe=68), E('spear', 170, fy(170), tribe=68), E('tshark', 164, 32), E('pueo', 162, fy(162, -2), tribe=69), E('pueo', 168, fy(168, -2), tribe=69)]]),
    dict(title="KAI-UILA", sub="The Storm Ray", rect=[188, 14, 229, 50], final=1, zoneDone="ZONE 2 CLEARED", zoneSub="The Archipelago is at peace", reward='rescue:smith',
         waves=[[E('giantray', 210, 32, enter='scurry')]])],
  gates=[dict(x=6, y=foot[6] + 2.5, to='sanctum'), dict(x=182, y=foot[182] + 2.5, to='sanctum')])

# ======================================================================= checks and output
WALK = set(':,.%_-Scb')
def seals_for(m, rect):
    x0, y0, x1, y1 = rect; Hh = len(m); Ww = len(m[0]); out = []
    at = lambda x, y: m[y][x] if 0 <= x < Ww and 0 <= y < Hh else '~'
    def runs(cells):
        cells = sorted(cells); res = []
        for c in cells:
            if res and c == res[-1][1] + 1: res[-1][1] = c
            else: res.append([c, c])
        return res
    L = [y for y in range(y0, y1 + 1) if at(x0, y) in WALK and at(x0 - 1, y) in WALK]
    Rr = [y for y in range(y0, y1 + 1) if at(x1, y) in WALK and at(x1 + 1, y) in WALK]
    T = [x for x in range(x0, x1 + 1) if at(x, y0) in WALK and at(x, y0 - 1) in WALK]
    B = [x for x in range(x0, x1 + 1) if at(x, y1) in WALK and at(x, y1 + 1) in WALK]
    for a, b in runs(L): out.append([x0 - 1.0, float(a), float(x0), b + 1.0])
    for a, b in runs(Rr): out.append([x1 + 1.0, float(a), x1 + 2.0, b + 1.0])
    for a, b in runs(T): out.append([float(a), y0 - 1.0, b + 1.0, float(y0)])
    for a, b in runs(B): out.append([float(a), y1 + 1.0, b + 1.0, y1 + 2.0])
    return out
SWIM = {'shark': '_-~', 'bigshark': '_-~', 'tshark': '_-~', 'ray': '_-', 'giantray': '_-~'}
def fix(m, e):
    ok = SWIM.get(e['e'], ':,.%_-Scb' if e['e'] not in ('pueo',) else None)
    if ok is None: return
    if e['e'] in ('spidercrab',): ok = 'c:_'
    Hh = len(m); Ww = len(m[0])
    def good(x, y):
        ix, iy = int(x), int(y)
        return all(0 <= ix + dx < Ww and 0 <= iy + dy < Hh and m[iy + dy][ix + dx] in ok for dx in (-1, 0, 1) for dy in (-1, 0, 1))
    if good(e['x'], e['y']): return
    for r in range(1, 16):
        for k in range(24):
            x = e['x'] + math.cos(k / 24 * 6.283) * r * 0.5; y = e['y'] + math.sin(k / 24 * 6.283) * r * 0.5
            if good(x, y): print('  moved', e['e'], (e['x'], e['y']), '->', (round(x, 1), round(y, 1))); e['x'] = round(x, 1); e['y'] = round(y, 1); return
    print('  NO SPOT for', e)
def reach(m, sx, sy):
    from collections import deque
    Hh = len(m); Ww = len(m[0]); seen = {(sx, sy)}; q = deque([(sx, sy)])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < Ww and 0 <= ny < Hh and (nx, ny) not in seen and m[ny][nx] in WALK: seen.add((nx, ny)); q.append((nx, ny))
    return seen
META = {
  'isles': dict(title="THE OUTER ISLES", sub="Where the reef meets the sun", hpMul=1.25, level=1, ivy=0.3, wallFace=24),
  'reef': dict(title="THE CORAL ATOLLS", sub="Rings of pink coral on a sea of glass", hpMul=1.4, level=2, ivy=0.3, wallFace=24),
  'vents': dict(title="THE THERMAL CLIFFS", sub="Where the sea boils at the mountain's foot", hpMul=1.55, level=3, ivy=0.55, wallFace=30),
}
lines = []
for k, v in OUT.items():
    m = v['map']; print('level', k, len(m[0]), 'x', len(m))
    for a in v['arenas']:
        a['seals'] = seals_for(m, a['rect']); print('  seals', a['title'], len(a['seals']))
        for w in a['waves']:
            for e in w: fix(m, e)
    for e in v['enemies']: fix(m, e)
    R0 = reach(m, int(v['spawn']['x']), int(v['spawn']['y']))
    for a in v['arenas']:
        x0, y0, x1, y1 = a['rect']; cells = [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1) if m[y][x] in WALK]
        print('  reach', a['title'], sum(1 for c in cells if c in R0), '/', len(cells))
    for gt in v['gates']: print('  gate', gt, (int(gt['x']), int(gt['y'] + 1)) in R0 or (int(gt['x']), int(gt['y'])) in R0)
    d = dict(META[k]); d.update(bg='sea', sea=True, cliff=110, amb='sea_' + k, zone=2)
    d.update({kk: vv for kk, vv in v.items()})
    lines.append(f"  D.{k} = " + json.dumps(d, ensure_ascii=False) + ";")
HEAD = """// Zone 2: the Archipelago. Generated by tools/zone2gen.py (see its notes on the level design). Do not
// edit by hand: change the generator and run it again.
//   1. The Outer Isles: wide open islands to explore, creatures in pockets; the feeding frenzy on the
//      Blue Road (survive 45s), and the Headland.
//   2. The Coral Atolls: rings of pink coral round lagoons, a boxed-in fight in each atoll, and the giant
//      spider crab, Pāpaʻi-Loa, on the island in the great atoll.
//   3. The Thermal Cliffs: east along basalt cliffs, the steaming shallows, the pueo roost on the
//      clifftop, the Boiling Bay, and Kai-Uila, the Storm Ray, in a lagoon with no land at all.
// Legend: ~ deep  - medium (wade slowly)  _ shallow  : sand  , grass  . soil  c coral  b basalt  # cliff  S stairs  % paving
(function () {
  const D = Level.DEFS;
"""
open(os.path.join(ROOT, 'js', 'zone2.js'), 'w').write(HEAD + "\n".join(lines) + '\n  Level.ZONES[1] = { name: "THE ARCHIPELAGO", lon: 2.4, lat: 0.3, levels: ["isles", "reef", "vents"] };\n})();\n')
print('wrote js/zone2.js')
