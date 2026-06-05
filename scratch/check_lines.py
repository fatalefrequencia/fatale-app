with open('src/App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for idx in range(3494, 3515):
    print(f"{idx+1}: {repr(lines[idx])}")
