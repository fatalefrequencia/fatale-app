import os
import numpy as np
from PIL import Image

img_path = r"C:\Users\Customer\.gemini\antigravity\brain\923130d5-a2b6-4bd3-aa92-b5d4297b37ba\media__1779285066336.png"
img = Image.open(img_path)
arr = np.array(img.convert("L"))
mask = arr > 40

os.makedirs("scratch/crops", exist_ok=True)

rows = {
    "UPPERCASE": (70, 149),
    "LOWERCASE": (210, 279),
    "NUMBERS": (320, 379),
    "PUNCTUATION": (420, 509)
}

for name, (ymin, ymax) in rows.items():
    row_mask = mask[ymin:ymax, :]
    col_sums = np.sum(row_mask, axis=0)
    
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
        
    for idx, (s, e) in enumerate(intervals):
        # Crop the letter
        cropped = img.crop((s, ymin, e + 1, ymax))
        cropped.save(f"scratch/crops/{name}_{idx:02d}.png")
print("Saved crops to scratch/crops/")
