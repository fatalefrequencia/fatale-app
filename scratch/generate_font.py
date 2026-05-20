import os
import numpy as np
from PIL import Image
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

img_path = r"C:\Users\Customer\.gemini\antigravity\brain\923130d5-a2b6-4bd3-aa92-b5d4297b37ba\media__1779285066336.png"
img = Image.open(img_path)
arr = np.array(img.convert("L"))
mask = arr > 40  # Threshold to find non-black pixels

rows = {
    "UPPERCASE": {
        "ymin": 70, "ymax": 149, "baseline": 139,
        "chars": [chr(c) for c in range(0x41, 0x5A + 1)], # A-Z
        "expected_count": 26,
        "split_idx_10": True # split K and L
    },
    "LOWERCASE": {
        "ymin": 210, "ymax": 279, "baseline": 264,
        "chars": [chr(c) for c in range(0x61, 0x7A + 1)], # a-z
        "expected_count": 26,
        "split_idx_10": False
    },
    "NUMBERS": {
        "ymin": 320, "ymax": 379, "baseline": 369,
        "chars": [str(c) for c in range(10)], # 0-9
        "expected_count": 10,
        "split_idx_10": False
    },
    "PUNCTUATION": {
        "ymin": 420, "ymax": 509, "baseline": 489,
        "chars": ["!", "?", ".", ",", ";", ":", "'", '"', "(", ")"],
        "expected_count": 10,
        "split_idx_10": False
    }
}

scale_x = 13.5
scale_y = 10
LSB_units = 30
RSB_units = 30

glyph_contours = {}
glyph_metrics = {}

# Keep track of characters we map
char_to_glyph = {}
glyph_order = [".notdef", "space"]

for row_name, row_info in rows.items():
    ymin = row_info["ymin"]
    ymax = row_info["ymax"]
    baseline = row_info["baseline"]
    expected_count = row_info["expected_count"]
    chars = row_info["chars"]
    
    row_mask = mask[ymin:ymax, :]
    col_sums = np.sum(row_mask, axis=0)
    
    # Segment intervals
    intervals = []
    in_char = False
    start = 0
    for x in range(len(col_sums)):
        if col_sums[x] > 0 and not in_char:
            start = x
            in_char = True
        elif col_sums[x] == 0 and in_char:
            intervals.append((start, x - 1))
            in_char = False
    if in_char:
        intervals.append((start, len(col_sums) - 1))
        
    # Split K and L if uppercase
    if row_info["split_idx_10"] and len(intervals) == 25:
        # intervals[10] is the merged K & L
        s, e = intervals[10]
        # Split point relative to s is Col 37 (which is s + 37)
        split_pt = s + 37
        new_intervals = intervals[:10] + [(s, split_pt - 1), (split_pt + 1, e)] + intervals[11:]
        intervals = new_intervals
        
    print(f"Row {row_name}: extracted {len(intervals)} intervals")
    
    # Process each character
    for idx, (s, e) in enumerate(intervals):
        if idx >= len(chars):
            break
        char = chars[idx]
        glyph_name = f"g_{ord(char)}"
        char_to_glyph[ord(char)] = glyph_name
        glyph_order.append(glyph_name)
        
        # Extract contours using our pixel border follower
        # Crop mask to interval
        cropped = mask[ymin:ymax, s:e+1]
        
        # Dilate mask by 1 pixel to make strokes bolder/thicker
        H, W = cropped.shape
        dilated = np.zeros_like(cropped)
        for r in range(H):
            for c in range(W):
                if cropped[r, c]:
                    r_min = max(0, r - 1)
                    r_max = min(H - 1, r + 1)
                    c_min = max(0, c - 1)
                    c_max = min(W - 1, c + 1)
                    dilated[r_min:r_max+1, c_min:c_max+1] = True
        cropped = dilated
        H, W = cropped.shape
        
        padded = np.zeros((H + 2, W + 2), dtype=bool)
        padded[1:H+1, 1:W+1] = cropped
        
        edges = []
        for r in range(1, H + 1):
            for c in range(1, W + 1):
                if padded[r, c]:
                    px = c - 1
                    py = r - 1
                    
                    if not padded[r, c + 1]:
                        edges.append(((px + 1, py), (px + 1, py + 1)))
                    if not padded[r, c - 1]:
                        edges.append(((px, py + 1), (px, py)))
                    if not padded[r + 1, c]:
                        edges.append(((px + 1, py + 1), (px, py + 1)))
                    if not padded[r - 1, c]:
                        edges.append(((px, py), (px + 1, py)))
                        
        # Chain edges
        adj = {}
        for u, v in edges:
            if u not in adj:
                adj[u] = []
            adj[u].append(v)
            
        loops = []
        while adj:
            start_node = next(iter(adj.keys()))
            curr = start_node
            path = [curr]
            while True:
                if curr not in adj or not adj[curr]:
                    break
                next_node = adj[curr].pop()
                if not adj[curr]:
                    del adj[curr]
                curr = next_node
                if curr == start_node:
                    break
                path.append(curr)
            if len(path) >= 3:
                loops.append(path)
                
        # Simplify and scale/offset contours
        final_contours = []
        for loop in loops:
            simplified = []
            n = len(loop)
            for i in range(n):
                prev_pt = simplified[-1] if simplified else loop[-1]
                curr_pt = loop[i]
                next_pt = loop[(i + 1) % n]
                
                collinear = False
                if prev_pt[0] == curr_pt[0] == next_pt[0]:
                    collinear = True
                elif prev_pt[1] == curr_pt[1] == next_pt[1]:
                    collinear = True
                    
                if not collinear:
                    simplified.append(curr_pt)
                    
            if len(simplified) < 3:
                continue
                
            font_loop = []
            for px, py in simplified:
                fx = int(px * scale_x + LSB_units)
                fy = int((baseline - (ymin + py)) * scale_y)
                font_loop.append((fx, fy))
            final_contours.append(font_loop)
            
        glyph_contours[glyph_name] = final_contours
        
        # Metric: (advance_width, LSB)
        advance_width = int(W * scale_x + LSB_units + RSB_units)
        glyph_metrics[glyph_name] = (advance_width, LSB_units)

# Build font using FontBuilder
fb = FontBuilder(1000, isTTF=True)
fb.setupGlyphOrder(glyph_order)

glyphs = {}
# .notdef glyph (empty)
pen = TTGlyphPen(None)
glyphs[".notdef"] = pen.glyph()

# space glyph (empty but has advance width)
pen = TTGlyphPen(None)
glyphs["space"] = pen.glyph()
glyph_metrics["space"] = (250, 0)
glyph_metrics[".notdef"] = (500, 50)
char_to_glyph[0x20] = "space"

# Populate all glyphs
for g_name in glyph_order:
    if g_name in [".notdef", "space"]:
        continue
    
    pen = TTGlyphPen(None)
    contours = glyph_contours[g_name]
    
    for contour in contours:
        pen.moveTo(contour[0])
        for pt in contour[1:]:
            pen.lineTo(pt)
        pen.closePath()
        
    glyphs[g_name] = pen.glyph()

fb.setupGlyf(glyphs)
fb.setupCharacterMap(char_to_glyph)

fb.setupNameTable({
    "familyName": "FataleNeon",
    "styleName": "Regular",
    "uniqueFontIdentifier": "FataleNeon Regular",
    "fullName": "FataleNeon",
    "psName": "FataleNeon-Regular",
})

metrics = {}
for g_name in glyph_order:
    metrics[g_name] = glyph_metrics[g_name]
    
fb.setupHorizontalMetrics(metrics)

fb.setupHorizontalHeader(ascent=800, descent=-200)
fb.setupOS2(sTypoAscender=800, sTypoDescender=-200)
fb.setupPost()

os.makedirs("src/assets/fonts", exist_ok=True)
out_path = "src/assets/fonts/FataleNeon.ttf"
fb.save(out_path)
print("Font build completed successfully! Saved to:", out_path)
