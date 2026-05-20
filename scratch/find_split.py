import numpy as np
from PIL import Image

img_path = r"C:\Users\Customer\Downloads\Fatale version 1\fatale-app\scratch\crops\UPPERCASE_10.png"
img = Image.open(img_path).convert("L")
arr = np.array(img)
mask = arr > 40

col_sums = np.sum(mask, axis=0)
print("Col sums:")
for i, val in enumerate(col_sums):
    print(f"Col {i:02d}: {val}")
