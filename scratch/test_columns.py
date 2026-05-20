import numpy as np
from PIL import Image

img_path = r"C:\Users\Customer\.gemini\antigravity\brain\923130d5-a2b6-4bd3-aa92-b5d4297b37ba\media__1779285066336.png"
img = Image.open(img_path).convert("L")
arr = np.array(img)
mask = arr > 40

rows = {
    "UPPERCASE": (70, 149, 26),
    "LOWERCASE": (210, 279, 26),
    "NUMBERS": (320, 379, 10),
    "PUNCTUATION": (420, 509, 10)
}

for name, (ymin, ymax, expected_count) in rows.items():
    row_mask = mask[ymin:ymax, :]
    col_sums = np.sum(row_mask, axis=0)
    
    # Find intervals where col_sums > 0
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
        
    print(f"{name}: found {len(intervals)} intervals, expected {expected_count}")
    # Print the lengths and gaps of intervals
    for idx, (s, e) in enumerate(intervals):
        gap = intervals[idx+1][0] - e if idx < len(intervals) - 1 else 0
        print(f"  {idx:02d}: x={s} to {e} (width={e-s+1}, next gap={gap})")
